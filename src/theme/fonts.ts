/**
 * Font families by weight.
 *
 * React Native does not synthesise weights for custom fonts the way a browser
 * does — `fontWeight: '800'` on a family that only ships Regular silently
 * renders Regular (iOS) or a faux-bold (Android). So every weight is its own
 * loaded family and call sites pick the family, never the weight.
 */

import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';

/** Passed to `useFonts`. */
export const fontAssets = {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    DMSerifDisplay_400Regular,
};

export const font = {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extrabold: 'PlusJakartaSans_800ExtraBold',
    /** Editorial face — headlines only, never body or UI labels. */
    serif: 'DMSerifDisplay_400Regular',
} as const;
