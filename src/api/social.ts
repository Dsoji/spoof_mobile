import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

import { ApiError, NetworkError, request } from './client';
import { setToken } from './session';

/**
 * Sign in with Apple and Google.
 *
 * Both are the *native* flow, not the browser redirect the web app uses: the
 * phone asks Apple or Google directly, gets back a signed ID token, and posts
 * that to `/api/v1/auth/social`. The studio verifies the signature against the
 * provider's published keys and returns the same bearer token
 * `/api/v1/auth/verify` returns for an emailed code, so everything downstream —
 * `setToken`, the session store, the resources — is unchanged.
 *
 * Why not Better Auth's own `/api/auth/sign-in/social`: the same reason the code
 * flow goes through `/api/v1/auth/*`. The throttle and the invitation
 * reconciliation live in the studio's service layer.
 *
 * Neither works in Expo Go — Apple's is a native module and Google's needs a
 * registered URL scheme — so both are dev-build-and-up.
 */

export type SocialResult =
    /** `isNewAccount` decides onboarding vs the home screen, as verify.tsx does. */
    | { ok: true; isNewAccount: boolean }
    /** The user backed out. Not an error: no message, nothing to show. */
    | { ok: false; cancelled: true }
    | { ok: false; cancelled?: false; message: string };

const CANCELLED: SocialResult = { ok: false, cancelled: true };

/**
 * The iOS OAuth client ID for Google, which is NOT the studio's web client ID —
 * a token minted for the web client carries the wrong audience and the studio
 * rejects it. Absent until one is issued in the Google Cloud console, which is
 * what `googleConfigured` reports so the button can stay disabled rather than
 * failing on tap.
 */
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

export const googleConfigured = GOOGLE_IOS_CLIENT_ID.length > 0;

/**
 * Apple is iOS 13+ only. `isAvailableAsync` is the honest check, but it is
 * async and a button needs an answer before it renders, so the platform is the
 * synchronous approximation — every iOS version this app supports has it.
 */
export const appleConfigured = Platform.OS === 'ios';

/** A fresh nonce, to bind the token the provider mints to this one request. */
async function newNonce(): Promise<string> {
    const bytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hand a verified ID token to the studio and store the bearer token it returns.
 *
 * Failures come back rather than throwing, like `verifyCode`: an unreachable
 * studio or a rejected token is an ordinary outcome of a sign-in screen.
 */
async function exchange(body: {
    provider: 'apple' | 'google';
    idToken: string;
    nonce?: string;
    name?: { firstName?: string; lastName?: string };
}): Promise<SocialResult> {
    try {
        const { token, isNewAccount } = await request<{ token: string; isNewAccount?: boolean }>(
            '/auth/social',
            { method: 'POST', anonymous: true, body },
        );
        await setToken(token);
        return { ok: true, isNewAccount: isNewAccount === true };
    } catch (e) {
        if (e instanceof ApiError) return { ok: false, message: e.message };
        if (e instanceof NetworkError) return { ok: false, message: e.message };
        throw e;
    }
}

export async function signInWithApple(): Promise<SocialResult> {
    if (!appleConfigured) {
        return { ok: false, message: 'Sign in with Apple is only available on iOS.' };
    }

    // The honest check, unlike the platform guess above: it answers false on a
    // build whose entitlement is missing, which is the single most common
    // reason signInAsync throws.
    if (!(await AppleAuthentication.isAvailableAsync())) {
        return {
            ok: false,
            message: __DEV__
                ? 'Sign in with Apple is unavailable on this build — the entitlement is missing. Enable the capability on the App ID and rebuild with `npm run ios`.'
                : 'Sign in with Apple is not available on this device.',
        };
    }

    const nonce = await newNonce();

    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
        credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            // Sent raw. Apple echoes this value into the identity token, and the
            // studio's provider compares exact-or-sha256, so no hashing here.
            nonce,
        });
    } catch (e) {
        // Backing out of Apple's sheet throws with this code rather than
        // resolving, so it has to be caught to tell a cancel from a failure.
        if (isAppleCancel(e)) return CANCELLED;

        // Everything else from Apple is a configuration or device problem, and
        // the generic retry message was actively misleading — "try again"
        // cannot fix a missing entitlement or a simulator with no Apple ID
        // signed in. The code is what names the cause, so it goes to the
        // console always and into the message in development.
        const detail = appleErrorDetail(e);
        console.warn('[social] Apple sign-in failed', detail, e);
        return {
            ok: false,
            message: __DEV__
                ? `Apple sign-in failed (${detail}). Check the console — a missing entitlement or no Apple ID signed in on this device are the usual causes.`
                : 'Could not sign in with Apple. Please try again.',
        };
    }

    if (!credential.identityToken) {
        return { ok: false, message: 'Apple did not return a sign-in token. Please try again.' };
    }

    return exchange({
        provider: 'apple',
        idToken: credential.identityToken,
        nonce,
        // Apple reports the name on the FIRST authorization a user ever grants
        // this app and never again — not on a later sign-in, not after a
        // reinstall. Forwarding it here is the only chance the account has of
        // being created with a real name; `fullName` is null every other time.
        ...(credential.fullName?.givenName || credential.fullName?.familyName
            ? {
                  name: {
                      firstName: credential.fullName.givenName ?? undefined,
                      lastName: credential.fullName.familyName ?? undefined,
                  },
              }
            : {}),
    });
}

/** Apple's cancel is an error with this code, not a resolved "cancelled" result. */
function isAppleCancel(e: unknown): boolean {
    return typeof e === 'object' && e !== null && 'code' in e && e.code === 'ERR_REQUEST_CANCELED';
}

/** Apple's own code and message, which is the only thing that identifies the cause. */
function appleErrorDetail(e: unknown): string {
    if (typeof e === 'object' && e !== null) {
        const { code, message } = e as { code?: unknown; message?: unknown };
        const parts = [typeof code === 'string' ? code : null, typeof message === 'string' ? message : null];
        const detail = parts.filter(Boolean).join(': ');
        if (detail) return detail;
    }
    return String(e);
}

const GOOGLE_ISSUER = 'https://accounts.google.com';

export async function signInWithGoogle(): Promise<SocialResult> {
    if (!googleConfigured) {
        return { ok: false, message: 'Google sign-in is not set up in this build yet.' };
    }

    try {
        const discovery = await AuthSession.fetchDiscoveryAsync(GOOGLE_ISSUER);

        // `scheme:/path` — ONE slash, and built by hand rather than with
        // makeRedirectUri, which produces `scheme://path`. Google reads the
        // two-slash form as having a host and rejects the request outright:
        // "Access blocked: Authorisation error ... doesn't comply with Google's
        // OAuth 2.0 policy", before the user is ever asked to approve anything.
        // expo-auth-session's own Google provider builds it this way too.
        //
        // The scheme is the reverse-DNS form of the client ID; Google will not
        // accept the app's own `spoofkitchen://`. plugins/with-google-signin-scheme.js
        // registers it in Info.plist, or iOS has nothing to hand the redirect to.
        const redirectUri = `${reversedClientId(GOOGLE_IOS_CLIENT_ID)}:/oauthredirect`;

        const nonce = await newNonce();

        // Code + PKCE rather than an implicit ID token: Google requires it for
        // installed apps. An iOS client is public, so the exchange needs no
        // client secret — which is why none appears in this repo.
        const authRequest = await AuthSession.loadAsync(
            {
                clientId: GOOGLE_IOS_CLIENT_ID,
                redirectUri,
                scopes: ['openid', 'email', 'profile'],
                usePKCE: true,
                extraParams: { nonce },
            },
            discovery,
        );

        const result = await authRequest.promptAsync(discovery);

        if (result.type === 'cancel' || result.type === 'dismiss') return CANCELLED;
        if (result.type !== 'success' || !result.params.code) {
            return { ok: false, message: 'Could not sign in with Google. Please try again.' };
        }

        const tokens = await AuthSession.exchangeCodeAsync(
            {
                clientId: GOOGLE_IOS_CLIENT_ID,
                code: result.params.code,
                redirectUri,
                extraParams: authRequest.codeVerifier ? { code_verifier: authRequest.codeVerifier } : {},
            },
            discovery,
        );

        if (!tokens.idToken) {
            return { ok: false, message: 'Google did not return a sign-in token. Please try again.' };
        }

        return exchange({ provider: 'google', idToken: tokens.idToken, nonce });
    } catch {
        return { ok: false, message: 'Could not sign in with Google. Please try again.' };
    }
}

/**
 * `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc`,
 * the URL scheme Google registers for an iOS client.
 */
function reversedClientId(clientId: string): string {
    const [id] = clientId.split('.apps.googleusercontent.com');
    return `com.googleusercontent.apps.${id}`;
}
