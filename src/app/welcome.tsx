import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Divider, PillButton, SocialButton } from '@/components/ui';
import { Field } from '@/components/Field';
import { Icon, SwirlMark } from '@/components/Icon';
import { requestCode } from '@/api/auth';
import { toast } from '@/components/Toast';
import { appleConfigured, googleConfigured, signInWithApple, signInWithGoogle } from '@/api/social';
import { HANDOFF } from '@/theme/handoff';
import { useMarkLanded } from '@/lib/mark-handoff';
import { color, font, layout, shadow, space, text, tone, HIT } from '@/theme';

/**
 * First launch.
 *
 * There is no password field, and there never will be: the studio runs Better
 * Auth with a 6-digit email OTP. Apple sits above Google because Apple's
 * guidelines require it to be at least as prominent as other third-party
 * options — and on iOS, offering Google at all is what makes it mandatory.
 *
 * One email field where the web has two pages. The server decides whether the
 * address is a sign-in or a sign-up; the only time this screen has to ask
 * anything more is when the address is new, which is when the name field
 * appears. Asking everyone for a name up front would tax the returning user to
 * spare the new one.
 */
export default function Welcome() {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [needsName, setNeedsName] = useState(false);
    const [sending, setSending] = useState(false);
    // Hidden until the splash mark finishes flying onto this spot.
    const landed = useMarkLanded();

    // The hero is purple edge to edge, so the clock and battery stay white here.
    useFocusEffect(
        useCallback(() => {
            setStatusBarStyle('light');
            return () => setStatusBarStyle('dark');
        }, []),
    );

    const canSend = email.trim().length > 0 && (!needsName || name.trim().length > 0);

    /**
     * Which provider is mid-sign-in, so the other two paths can be blocked
     * without a second flag. A social sign-in opens a sheet the app does not
     * control; tapping the other provider underneath it would leave two
     * authorizations racing to store a token.
     */
    const [social, setSocial] = useState<'apple' | 'google' | null>(null);
    const busy = sending || social !== null;

    const onSocial = async (provider: 'apple' | 'google') => {
        if (busy) return;
        setSocial(provider);
        try {
            const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
            if (result.ok) {
                // Same landing as verify.tsx, including onboarding for an
                // account this sign-in just created — and `replace`, so the back
                // gesture cannot return to a sign-in screen from inside the app.
                router.replace(result.isNewAccount ? '/onboarding/niche' : '/(tabs)');
                return;
            }
            // A cancel is the user changing their mind, not a failure worth a
            // toast about.
            if (!result.cancelled) toast(result.message);
        } finally {
            setSocial(null);
        }
    };

    const onSend = async () => {
        if (!canSend || sending) return;
        setSending(true);

        try {
            const result = await requestCode(email.trim(), needsName ? name.trim() : undefined);

            if (result.ok) {
                // The email travels as a param rather than in a store: the code
                // screen is reachable directly, and needs to know which address
                // the code went to in order to verify or resend it.
                router.push({
                    pathname: '/verify',
                    params: { email: email.trim(), isNew: result.isNewAccount ? '1' : '0' },
                });
                return;
            }

            if (result.needsName) {
                setNeedsName(true);
                return;
            }
            toast(result.message);
        } finally {
            // In a finally rather than after the await: anything unexpected
            // escaping leaves the button spinning at a request that is over,
            // which is worse than the error itself — there is no way back from
            // it without killing the app.
            setSending(false);
        }
    };

    const { markSize, markTop, gutter, discPad } = HANDOFF.welcome;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.brand }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Layered shapes for depth, the same pair as Home's hero. */}
                <View style={{ position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: color.brandHover, right: -120, top: -100 }} />
                <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: tone.violet, left: -70, top: insets.top + 250 }} />

                {/* Geometry shared with the splash hand-off — see @/theme/handoff. */}
                <View style={{ paddingTop: insets.top + layout.headerTop + markTop, paddingHorizontal: gutter, gap: 18 }}>
                    <View style={{ width: markSize, height: markSize }}>
                        {/* The white disc keeps the indigo arm legible on purple. */}
                        <View
                            style={{
                                position: 'absolute',
                                left: -discPad,
                                top: -discPad,
                                width: markSize + discPad * 2,
                                height: markSize + discPad * 2,
                                borderRadius: markSize / 2 + discPad,
                                backgroundColor: color.white,
                            }}
                        />
                        <View style={{ opacity: landed ? 1 : 0 }}>
                            <SwirlMark size={markSize} />
                        </View>
                    </View>
                    <Text style={[text.displayXl, { letterSpacing: -0.4, color: color.white, paddingTop: 6 }]}>
                        Ideas don’t wait for your laptop
                    </Text>
                    <Text style={[text.bodyLg, { fontFamily: font.semibold, fontSize: 15.5, lineHeight: 23, color: color.brandWash }]}>
                        Jot it on the bus. Cook it into a post. Send it everywhere — without opening the studio.
                    </Text>
                </View>

                <View
                    style={{
                        position: 'absolute',
                        right: 22,
                        top: insets.top + layout.headerTop + markTop + 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: color.ink,
                        transform: [{ rotate: '8deg' }],
                    }}
                >
                    <Text style={{ fontFamily: font.extrabold, fontSize: 12, color: color.accent }}>Keep it hot</Text>
                </View>

                <View style={{ flex: 1, minHeight: 28 }} />

                <View
                    style={[
                        {
                            backgroundColor: color.cream,
                            borderTopLeftRadius: 34,
                            borderTopRightRadius: 34,
                            paddingHorizontal: space.xxl,
                            paddingTop: 26,
                            paddingBottom: Math.max(insets.bottom, space.xl) + 6,
                            gap: 14,
                        },
                        shadow.sheet,
                    ]}
                >
                    <Field
                        label="Email"
                        value={email}
                        onChangeText={(v) => {
                            setEmail(v);
                            // A new address may not be the one the name was for.
                            setNeedsName(false);
                        }}
                        placeholder="you@studio.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        returnKeyType={needsName ? 'next' : 'go'}
                        onSubmitEditing={needsName ? undefined : onSend}
                    />

                    {needsName ? (
                        <>
                            <Field
                                label="Your name"
                                value={name}
                                onChangeText={setName}
                                placeholder="Dami"
                                autoCapitalize="words"
                                autoComplete="name"
                                returnKeyType="go"
                                onSubmitEditing={onSend}
                            />
                            <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, backgroundColor: color.brandTint }}>
                                <Icon name="sparkle" size={16} tint={color.brand} weight={2.4} />
                                <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 12.5, lineHeight: 17, color: color.chipSelectedFg }}>
                                    New here — we’ll set up a kitchen for you. This is what we’ll call you.
                                </Text>
                            </View>
                        </>
                    ) : null}

                    <PillButton
                        label={needsName ? 'Create my kitchen' : 'Email me a code'}
                        onPress={onSend}
                        disabled={!canSend || social !== null}
                        loading={sending}
                    />

                    <Divider label="or" />

                    {/*
                      * Each provider is shown only where it can actually work:
                      * Apple on iOS, Google once EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
                      * is in the build. A button that is drawn but disabled is
                      * still honest; one that is drawn and silently does nothing
                      * is not, which is what these both were.
                      */}
                    {appleConfigured || googleConfigured ? (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {appleConfigured ? (
                                <SocialButton
                                    provider="apple"
                                    label="Continue with Apple"
                                    loading={social === 'apple'}
                                    disabled={busy && social !== 'apple'}
                                    onPress={() => void onSocial('apple')}
                                />
                            ) : null}
                            <SocialButton
                                provider="google"
                                label="Continue with Google"
                                loading={social === 'google'}
                                disabled={!googleConfigured || (busy && social !== 'google')}
                                onPress={() => void onSocial('google')}
                            />
                        </View>
                    ) : null}

                    <Link href="/verify" asChild>
                        <Pressable
                            accessibilityRole="link"
                            style={{ minHeight: HIT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                            <Text style={[text.meta, { fontSize: 14, color: color.muted }]}>Already have a code?</Text>
                            <Text style={text.link}>Enter it</Text>
                        </Pressable>
                    </Link>

                    <Text style={[text.micro, { textAlign: 'center', paddingHorizontal: space.sm, color: color.muted }]}>
                        No password to remember. By continuing you agree to our{' '}
                        <Text style={{ color: color.ink, fontFamily: font.bold }}>Terms</Text> and{' '}
                        <Text style={{ color: color.ink, fontFamily: font.bold }}>Privacy Policy</Text>.
                    </Text>
                </View>
                {/* Pull-up overscroll shows cream under the sheet, not a purple gap. */}
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: -800, height: 800, backgroundColor: color.cream }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
