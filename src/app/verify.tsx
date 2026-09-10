import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button, Gutter, IconButton, Screen } from '@/components/ui';
import { me } from '@/data/mock';
import { color, font, radius, space, text, HIT } from '@/theme';

/** A complete code, so the shell is walkable end to end. */
const ENTERED = ['2', '4', '9', '1', '6', '3'];
const LENGTH = 6; // SIGN_IN_CODE_LENGTH in the web app's validations/schemas.ts

/**
 * The OTP step.
 *
 * The Verify button flows with the content rather than pinning to the bottom:
 * the keyboard is up on this screen, and a pinned footer would sit behind it.
 */
export default function Verify() {
    return (
        <Screen>
            <Gutter style={{ paddingHorizontal: space.xxl }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />

                <View style={{ paddingTop: 34, gap: 12 }}>
                    <Text style={[text.displayLg, { fontSize: 38, lineHeight: 44 }]}>Check your email</Text>
                    <Text style={[text.bodyLg, { fontSize: 15.5, lineHeight: 23 }]}>
                        We sent a {LENGTH}-digit code to{' '}
                        <Text style={{ fontFamily: font.extrabold, color: color.ink }}>{me.email}</Text>
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 9, paddingTop: 34 }}>
                    {Array.from({ length: LENGTH }).map((_, i) => {
                        const focused = i === ENTERED.length;
                        return (
                            <View
                                key={i}
                                style={{
                                    flex: 1,
                                    height: 62,
                                    borderRadius: radius.cta,
                                    backgroundColor: focused ? color.brandWash : color.surface,
                                    borderWidth: 1.5,
                                    borderColor: focused ? color.brand : color.fieldBorder,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {ENTERED[i] ? (
                                    <Text style={{ fontFamily: font.extrabold, fontSize: 24, color: color.ink }}>
                                        {ENTERED[i]}
                                    </Text>
                                ) : focused ? (
                                    <View style={{ width: 2, height: 26, backgroundColor: color.brand }} />
                                ) : null}
                            </View>
                        );
                    })}
                </View>

                <View style={{ paddingTop: 28 }}>
                    <Button
                        label="Verify"
                        disabled={ENTERED.length < LENGTH}
                        onPress={() => router.replace('/onboarding/niche')}
                    />
                </View>

                <View
                    style={{
                        paddingTop: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    <Text style={[text.meta, { fontSize: 14 }]}>Didn’t get it?</Text>
                    <Pressable style={{ minHeight: HIT, justifyContent: 'center' }} hitSlop={8}>
                        <Text style={text.link}>Resend code</Text>
                    </Pressable>
                </View>
            </Gutter>
        </Screen>
    );
}
