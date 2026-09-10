import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { color, fontAssets } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded] = useFonts(fontAssets);

    useEffect(() => {
        // Holding the splash until the faces land avoids a frame of system font,
        // which is very visible against DM Serif headlines.
        if (loaded) SplashScreen.hideAsync();
    }, [loaded]);

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
        </SafeAreaProvider>
    );
}
