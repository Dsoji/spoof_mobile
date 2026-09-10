import * as SecureStore from 'expo-secure-store';

/**
 * The bearer token, and where it is kept.
 *
 * The studio issues this from the same 6-digit email OTP flow the web app uses
 * — `src/lib/auth.ts` there now loads Better Auth's bearer plugin, so a
 * successful sign-in returns the session in a `set-auth-token` response header
 * instead of only a Set-Cookie. There is no second auth system and no second
 * kind of credential; this is the same session row, carried in a header.
 *
 * SecureStore rather than AsyncStorage because this IS the credential: on iOS
 * it lands in the Keychain, on Android in encrypted shared preferences. A
 * session token in plain AsyncStorage is readable by anything that can reach
 * the app's sandbox.
 *
 * NOTE: nothing writes a token yet. The sign-in screens are still the static
 * shell — `welcome.tsx` has no email field — so until they are wired, use
 * EXPO_PUBLIC_DEV_BEARER_TOKEN below.
 */

const KEY = 'spoofkitchen.bearer';

/**
 * A token supplied at build time, for driving the app before sign-in exists.
 *
 * Development only, and guarded so it cannot survive into a release build even
 * if the variable is set in the shipping environment by accident.
 */
const DEV_TOKEN = __DEV__ ? (process.env.EXPO_PUBLIC_DEV_BEARER_TOKEN ?? null) : null;

let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
    if (cached !== undefined) return cached;

    // A stored token wins over the dev one, so signing in for real overrides
    // the build-time escape hatch rather than being silently ignored.
    try {
        cached = (await SecureStore.getItemAsync(KEY)) ?? DEV_TOKEN;
    } catch {
        // SecureStore throws rather than returning null when the keychain is
        // unavailable (a simulator mid-reset, a device without a passcode on
        // some Android builds). Treat that as signed out, not as a crash.
        cached = DEV_TOKEN;
    }
    return cached;
}

export async function setToken(token: string): Promise<void> {
    cached = token;
    await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
    cached = null;
    await SecureStore.deleteItemAsync(KEY);
}
