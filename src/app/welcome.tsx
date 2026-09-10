import { Link, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button, Gutter, Screen } from '@/components/ui';
import { SwirlMark } from '@/components/Icon';
import { color, font, radius, space, text, HIT } from '@/theme';

/**
 * First launch.
 *
 * There is no password field, and there never will be: the studio runs Better
 * Auth with a 6-digit email OTP. Apple sits above Google because Apple's
 * guidelines require it to be at least as prominent as other third-party
 * options — and on iOS, offering Google at all is what makes it mandatory.
 */
export default function Welcome() {
    return (
        <Screen
            footer={
                <>
                    <Button label="Email me a code" onPress={() => router.push('/verify')} />
                    <Button label="Continue with Apple" variant="dark" />
                    <Button label="Continue with Google" variant="secondary" />
                    <Link href="/verify" asChild>
                        <Pressable
                            style={{
                                minHeight: HIT,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Text style={[text.meta, { fontSize: 14 }]}>Already cooking?</Text>
                            <Text style={text.link}>Sign in</Text>
                        </Pressable>
                    </Link>
                    <Text style={[text.micro, { textAlign: 'center', paddingHorizontal: space.sm }]}>
                        No password to remember. By continuing you agree to our{' '}
                        <Text style={{ color: color.subtle, fontFamily: font.bold }}>Terms</Text> and{' '}
                        <Text style={{ color: color.subtle, fontFamily: font.bold }}>Privacy Policy</Text>.
                    </Text>
                </>
            }
        >
            {/* Warm bloom behind the mark — the brief's "soft radial glow". */}
            <View
                style={{
                    position: 'absolute',
                    top: -90,
                    left: -70,
                    width: 320,
                    height: 320,
                    borderRadius: 160,
                    backgroundColor: color.brandWash,
                }}
            />
            <Gutter style={{ paddingTop: 52, gap: 26, paddingHorizontal: 28 }}>
                <SwirlMark />
                <View style={{ gap: 14 }}>
                    <Text style={[text.displayXl, { letterSpacing: -0.4 }]}>
                        Ideas don’t wait for your laptop
                    </Text>
                    <Text style={text.bodyLg}>
                        Jot it on the bus. Cook it into a post. Send it everywhere — without opening the studio.
                    </Text>
                </View>
            </Gutter>
        </Screen>
    );
}
