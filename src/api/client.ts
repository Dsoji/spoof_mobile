import { API_BASE } from './config';
import { clearToken, getToken } from './session';

/**
 * The one place a request to the studio is made.
 *
 * Every route under /api/v1 answers `{ error: string }` with a real status
 * code, so failures are turned into a thrown ApiError carrying both — screens
 * can show `e.message` directly, and a 401 is distinguishable from an outage
 * without parsing prose.
 */

export class ApiError extends Error {
    readonly status: number;
    /** The rest of the error body, for routes that return more than a message. */
    readonly payload: Record<string, unknown>;

    constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }

    /** The token is missing, expired, or was revoked — sign in again. */
    get isAuth(): boolean {
        return this.status === 401;
    }
}

/**
 * Nothing reached the server: airplane mode, dead wifi, the studio not
 * running, or an API_URL the device cannot route to.
 *
 * In development the resolved URL is appended, because those causes are
 * indistinguishable from the user-facing message and the URL separates them at
 * a glance — `localhost:3000` from a real phone is a routing mistake, a LAN
 * address that times out is usually the studio simply not being up. Stripped
 * in release: a shipped build should not show anyone a hostname.
 */
export class NetworkError extends Error {
    constructor(cause: unknown, url?: string) {
        super(
            __DEV__ && url
                ? `Could not reach the studio at ${url}. Is it running?`
                : 'Could not reach the studio. Check your connection.',
        );
        this.name = 'NetworkError';
        this.cause = cause;
    }
}

type Options = {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    /** Abort in-flight when a screen unmounts mid-request. */
    signal?: AbortSignal;
    /**
     * Send without a token. Only the sign-in routes: requesting a code and
     * exchanging it are how a session begins, so requiring one would be
     * circular.
     */
    anonymous?: boolean;
};

export async function request<T>(path: string, options: Options = {}): Promise<T> {
    const { method = 'GET', body, signal, anonymous = false } = options;
    const token = anonymous ? null : await getToken();

    if (!anonymous && !token) {
        throw new ApiError('Not signed in.', 401);
    }

    const url = `${API_BASE}${path}`;

    let response: Response;
    try {
        response = await fetch(url, {
            method,
            signal,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (e) {
        // Rethrow a cancellation as-is; callers ignore it, and dressing it up as
        // a network failure would flash an error on a screen the user just left.
        if (e instanceof Error && e.name === 'AbortError') throw e;
        throw new NetworkError(e, url);
    }

    // 204 and friends have no body to parse.
    const raw = response.status === 204 ? '' : await response.text();
    let payload: unknown = null;
    if (raw) {
        try {
            payload = JSON.parse(raw);
        } catch {
            // An HTML body here almost always means the request never reached a
            // route handler — a redirect to /login, or a proxy error page. Say
            // so rather than surfacing a JSON parse error.
            throw new ApiError(
                response.ok ? 'The studio returned an unexpected response.' : `Request failed (${response.status}).`,
                response.ok ? 500 : response.status,
            );
        }
    }

    if (!response.ok) {
        const bodyObject = (payload ?? {}) as Record<string, unknown>;
        const message = (bodyObject.error as string | undefined) ?? `Request failed (${response.status}).`;

        // A 401 on a request that DID carry a token means the token is no
        // longer good — expired, or revoked from the studio. Dropping it here
        // is what ends the session: useSession sees the change and the guard in
        // _layout.tsx sends the user to /welcome. Without this the app stays
        // convinced it is signed in and every screen fails identically forever,
        // with the manual Log out on the You tab as the only way out.
        //
        // Anonymous requests are exempt: /auth/verify answers 401 for a
        // mistyped code, which is an ordinary outcome and not a dead session.
        if (response.status === 401 && !anonymous) {
            await clearToken();
        }

        throw new ApiError(message, response.status, bodyObject);
    }

    return payload as T;
}
