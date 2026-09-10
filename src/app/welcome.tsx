import { useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Gutter } from '@/components/ui';
import { Field } from '@/components/Field';
import { SwirlMark } from '@/components/Icon';
import { requestCode } from '@/api/auth';
import { color, font, layout, space, text, HIT } from '@/theme';

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
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const canSend = email.trim().length > 0 && (!needsName || name.trim().length > 0);

    const onSend = async () => {
        if (!canSend || sending) return;
        setSending(true);
        setError(null);

        const result = await requestCode(email.trim(), needsName ? name.trim() : undefined);
        setSending(false);

        if (result.ok) {
            // The email travels as a param rather than in a store: the code
            // screen is reachable directly, and needs to know which address the
            // code went to in order to verify or resend it.
            router.push({
                pathname: '/verify',
                params: { email: email.trim(), isNew: result.isNewAccount ? '1' : '0' },
            });
            return;
        }

        if (result.needsName) {
            setNeedsName(true);
            setError(null);
            return;
        }
        setError(result.message);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, backgroundColor: color.cream }}
        >
            <ScrollView
                contentContainerStyle={{ paddingTop: insets.top + layout.headerTop, paddingBottom: space.xl }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
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

                <Gutter style={{ paddingTop: 32, gap: 14 }}>
                    <Field
                        label="Email"
                        value={email}
                        onChangeText={(v) => {
                            setEmail(v);
                            // A new address may not be the one the name was for.
                            setNeedsName(false);
                            setError(null);
                        }}
                        placeholder="you@studio.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        returnKeyType={needsName ? 'next' : 'go'}
                        onSubmitEditing={needsName ? undefined : onSend}
                        error={error}
                    />

                    {needsName ? (
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
                    ) : null}

                    {needsName ? (
                        <Text style={text.micro}>
                            We don’t have an account for that address yet — this is what we’ll call you.
                        </Text>
                    ) : null}

                    <Button
                        label={needsName ? 'Create my kitchen' : 'Email me a code'}
                        onPress={onSend}
                        disabled={!canSend}
                        loading={sending}
                    />
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
                            <Text style={[text.meta, { fontSize: 14 }]}>Already have a code?</Text>
                            <Text style={text.link}>Enter it</Text>
                        </Pressable>
                    </Link>

                    <Text style={[text.micro, { textAlign: 'center', paddingHorizontal: space.sm }]}>
                        No password to remember. By continuing you agree to our{' '}
                        <Text style={{ color: color.subtle, fontFamily: font.bold }}>Terms</Text> and{' '}
                        <Text style={{ color: color.subtle, fontFamily: font.bold }}>Privacy Policy</Text>.
                    </Text>
                </Gutter>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
