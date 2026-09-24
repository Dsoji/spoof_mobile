import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Splash } from '@/components/Splash';
import { ToastHost } from '@/components/Toast';
import { useSession, type SessionStatus } from '@/api/useSession';
import { useLaunchSettled } from '@/api/boot';
import { color, fontAssets } from '@/theme';

SplashScreen.preventAutoHideAsync();

/** Screens reachable without a token. */
const AUTH_ROUTES = new Set(['welcome', 'verify']);

/**
 * Keep the route and the session agreed.
 *
 * The entry redirect in index.tsx picks the right first screen, but it only
 * runs once. This is what handles the session ENDING mid-session — a token
 * that expired or was revoked, which surfaces as a 401 on the next request —
 * so someone is not left tapping around inside tabs that can no longer load
 * anything.
 *
 * Runs as a hook inside the layout rather than as a redirect on each screen so
 * there is one rule in one place; navigating from here is only safe because
 * the Stack below is already mounted by the time an effect fires.
 */
function useSessionRoute(): SessionStatus {
    const status = useSession();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading') return;

        // Empty on the index route, which does its own redirect. Widened
        // because typed routes narrow this to the known segment literals,
        // which does not include the empty case.
        const first: string | undefined = segments[0];
        if (!first) return;

        const onAuthScreen = AUTH_ROUTES.has(first);

        if (status === 'signedOut' && !onAuthScreen) {
            router.replace('/welcome');
        } else if (status === 'signedIn' && onAuthScreen) {
            router.replace('/(tabs)');
        }
    }, [status, segments, router]);

    return status;
}

export default function RootLayout() {
    const [loaded] = useFonts(fontAssets);
    const [splashDone, setSplashDone] = useState(false);

    const session = useSessionRoute();
    const launched = useLaunchSettled();

    useEffect(() => {
        // Holding the native splash until the faces land avoids a frame of
        // system font, which is very visible against DM Serif headlines. It is
        // safe to hide the moment `<Splash>` can mount: that overlay redraws
        // the same mark in the same place, so nothing flashes.
        if (loaded) SplashScreen.hideAsync();
    }, [loaded]);

    const onSplashDone = useCallback(() => setSplashDone(true), []);

    if (!loaded) return null;

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: color.cream },
                }}
            >
                <Stack.Screen name="capture" options={{ presentation: 'modal' }} />
                <Stack.Screen
                    name="publish"
                    options={{ presentation: 'transparentModal', animation: 'fade' }}
                />
            </Stack>
            {/* Above the navigator, so a message outlives the screen that
                raised it navigating away. */}
            <ToastHost />

            {/* Rendered over the navigator rather than as a route, so the first
                screen is already mounted and settled behind it when it lifts —
                which is also what lets the mark hand off onto welcome's own.
                `ready` waits on the session as well as the fonts: the splash
                flies its mark only when welcome is next, and it cannot know
                that while the keychain read is still in flight. It also waits,
                briefly, on the launch prime in api/boot.ts, so a returning user's
                first screen opens with its data rather than spinners. */}
            {!splashDone && (
                <Splash ready={loaded && session !== 'loading' && launched} onDone={onSplashDone} />
            )}
        </SafeAreaProvider>
    );
}
