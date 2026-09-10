import { ApiError, NetworkError, request } from './client';
import { clearToken, setToken } from './session';

/**
 * Sign-in: passwordless, a 6-digit code by email.
 *
 * These call /api/v1/auth/* rather than Better Auth's own endpoints directly.
 * That is deliberate — the per-IP and per-mailbox throttles on minting and
 * verifying live in the studio's service layer, and a client talking straight
 * to /api/auth/sign-in/email-otp would bypass every one of them, leaving a
 * 6-digit code with nothing standing between it and a brute force.
 */

export const CODE_LENGTH = 6; // SIGN_IN_CODE_LENGTH in the studio's validations/schemas.ts

export type RequestCodeResult =
    | { ok: true; isNewAccount: boolean }
    /**
     * The address has no account yet and the server needs a display name
     * before it can make one. The web collects this on a separate /register
     * page; the app reveals a second field instead.
     */
    | { ok: false; needsName: true; message: string }
    | { ok: false; needsName: false; message: string };

export async function requestCode(email: string, name?: string): Promise<RequestCodeResult> {
    try {
        const result = await request<{ ok: true; isNewAccount: boolean }>('/auth/request-code', {
            method: 'POST',
            anonymous: true,
            body: { email, ...(name ? { name } : {}) },
        });
        return { ok: true, isNewAccount: result.isNewAccount };
    } catch (e) {
        if (e instanceof ApiError) {
            return { ok: false, needsName: e.payload.needsName === true, message: e.message };
        }
        // A studio that cannot be reached is an ordinary outcome here, not an
        // exception. Thrown, it escaped every caller's `await` and left their
        // pending flag set — the button span forever on a failure the user
        // could see had already happened.
        if (e instanceof NetworkError) {
            return { ok: false, needsName: false, message: e.message };
        }
        throw e;
    }
}

/**
 * Exchange the code for a bearer token and store it.
 *
 * Returns rather than throws on a bad code: an expired or mistyped code is an
 * ordinary outcome of this screen, not an exception.
 */
export async function verifyCode(email: string, code: string): Promise<{ ok: boolean; message?: string }> {
    try {
        const { token } = await request<{ token: string }>('/auth/verify', {
            method: 'POST',
            anonymous: true,
            body: { email, code },
        });
        await setToken(token);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { ok: false, message: e.message };
        if (e instanceof NetworkError) return { ok: false, message: e.message };
        throw e;
    }
}

/**
 * Forget the token.
 *
 * Local only: it does not revoke the session server-side, so the row outlives
 * the sign-out until it expires. Worth revisiting when there is a
 * /api/v1/auth/sign-out to call.
 */
export async function signOut(): Promise<void> {
    await clearToken();
}
