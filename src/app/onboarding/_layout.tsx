import { Stack } from 'expo-router';

import { color } from '@/theme';

/** The four prep questions plus the channel hand-off. */
export default function OnboardingLayout() {
    return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.cream } }} />;
}
