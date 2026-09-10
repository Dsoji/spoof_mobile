import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Gutter, IconButton } from '@/components/ui';
import { CODE_LENGTH, requestCode, verifyCode } from '@/api/auth';
import { toast } from '@/components/Toast';
import { color, font, layout, radius, space, text, HIT } from '@/theme';

/**
 * The OTP step.
 *
 * The six boxes are a presentation of ONE hidden input, not six inputs. Six
 * would mean managing focus by hand on every keystroke and on backspace, and
 * would break iOS's one-tap SMS/email autofill, which needs a single field with
 * `textContentType="oneTimeCode"` to fill into.
 *
 * The Verify button flows with the content rather than pinning to the bottom:
 * the keyboard is up on this screen, and a pinned footer would sit behind it.
 */
export default function Verify() {
    const insets = useSafeAreaInsets();
    const { email, isNew } = useLocalSearchParams<{ email?: string; isNew?: string }>();
    const input = useRef<TextInput>(null);

    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [resendNote, setResendNote] = useState<string | null>(null);
    const [resending, setResending] = useState(false);

    const complete = code.length === CODE_LENGTH;

    const onVerify = async (value = code) => {
        if (value.length < CODE_LENGTH || verifying || !email) return;
        setVerifying(true);
        setError(null);

        let result: { ok: boolean; message?: string };
        try {
            result = await verifyCode(email, value);
        } catch (e) {
            // Nothing should reach here — verifyCode answers rather than
            // throws — but a spinning button with no way out is the one
            // failure mode this screen must not have.
            setVerifying(false);
            toast(e instanceof Error ? e.message : 'Could not verify that code.');
            return;
        }

        if (result.ok) {
            // replace, not push: the code is spent, and back should not return
            // to a screen that can no longer do anything.
            //
            // A brand-new account gets the prep questions; anyone who already
            // had one answered them on the web and should not be asked twice.
            router.replace(isNew === '1' ? '/onboarding/niche' : '/(tabs)');
            return;
        }

        setVerifying(false);
        setCode('');
        // Inline as well as toast: this one is about the field directly under
        // it, and the boxes clear themselves, so a message that leaves after
        // four seconds would take the only explanation of why with it.
        setError(result.message ?? 'That code is invalid or has expired.');
    };

    const onChange = (raw: string) => {
        const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
        setCode(digits);
        setError(null);
        // Submit on the sixth digit rather than making the user reach for the
        // button — the code is complete and there is nothing left to decide.
        if (digits.length === CODE_LENGTH) void onVerify(digits);
    };

    const onResend = async () => {
        // Guarded as well as disabled: minting is throttled per mailbox, so a
        // double tap spends two of a small budget and the second one comes
        // back as "please wait a few minutes" — which reads as the resend
        // being broken rather than as having worked twice.
        if (!email || resending) return;
        setResending(true);
        setError(null);
        try {
            const result = await requestCode(email);
            if (result.ok) {
                setResendNote('Sent — check your inbox.');
                toast('A new code is on its way.', 'success');
            } else {
                toast(result.message);
            }
        } finally {
            setResending(false);
        }
    };

    // Reachable directly from "Already have a code?", which does not know the
    // address. Verifying needs one, so send them back for it.
    if (!email) {
        return (
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + layout.headerTop }}>
                <Gutter style={{ paddingHorizontal: space.xxl, gap: 20 }}>
                    <IconButton name="chevronLeft" onPress={() => router.back()} />
                    <Text style={[text.displayLg, { fontSize: 32, lineHeight: 38 }]}>
                        Which address?
                    </Text>
                    <Text style={text.bodyLg}>
                        Enter your email first and we’ll send a fresh code to it.
                    </Text>
                    <Button label="Back to sign in" onPress={() => router.replace('/welcome')} />
                </Gutter>
            </ScrollView>
        );
    }

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
                <Gutter style={{ paddingHorizontal: space.xxl }}>
                    <IconButton name="chevronLeft" onPress={() => router.back()} />

                    <View style={{ paddingTop: 34, gap: 12 }}>
                        <Text style={[text.displayLg, { fontSize: 38, lineHeight: 44 }]}>Check your email</Text>
                        <Text style={[text.bodyLg, { fontSize: 15.5, lineHeight: 23 }]}>
                            We sent a {CODE_LENGTH}-digit code to{' '}
                            <Text style={{ fontFamily: font.extrabold, color: color.ink }}>{email}</Text>
                        </Text>
                    </View>

                    {/* The real input: full-bleed and invisible, so a tap
                        anywhere on the boxes focuses it. */}
                    <Pressable onPress={() => input.current?.focus()} style={{ paddingTop: 34 }}>
                        <View style={{ flexDirection: 'row', gap: 9 }} pointerEvents="none">
                            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                                const focused = i === code.length;
                                return (
                                    <View
                                        key={i}
                                        style={{
                                            flex: 1,
                                            height: 62,
                                            borderRadius: radius.cta,
                                            backgroundColor: focused ? color.brandWash : color.surface,
                                            borderWidth: 1.5,
                                            borderColor: error
                                                ? color.dangerBorder
                                                : focused
                                                    ? color.brand
                                                    : color.fieldBorder,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {code[i] ? (
                                            <Text
                                                style={{ fontFamily: font.extrabold, fontSize: 24, color: color.ink }}
                                            >
                                                {code[i]}
                                            </Text>
                                        ) : focused ? (
                                            <View style={{ width: 2, height: 26, backgroundColor: color.brand }} />
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                        <TextInput
                            ref={input}
                            autoFocus
                            value={code}
                            onChangeText={onChange}
                            keyboardType="number-pad"
                            textContentType="oneTimeCode"
                            autoComplete="one-time-code"
                            maxLength={CODE_LENGTH}
                            editable={!verifying}
                            style={{
                                position: 'absolute',
                                top: 34,
                                left: 0,
                                right: 0,
                                height: 62,
                                // Invisible rather than unmounted: it has to stay
                                // in the tree to hold focus and receive autofill.
                                opacity: 0,
                            }}
                        />
                    </Pressable>

                    {error ? (
                        <Text
                            style={{
                                paddingTop: 12,
                                fontFamily: font.semibold,
                                fontSize: 13,
                                color: color.danger,
                            }}
                        >
                            {error}
                        </Text>
                    ) : null}

                    <View style={{ paddingTop: 28 }}>
                        <Button
                            label="Verify"
                            disabled={!complete}
                            loading={verifying}
                            onPress={() => onVerify()}
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
                        <Text style={[text.meta, { fontSize: 14 }]}>
                            {resending ? 'Sending a new code…' : (resendNote ?? 'Didn’t get it?')}
                        </Text>
                        {resendNote || resending ? null : (
                            <Pressable style={{ minHeight: HIT, justifyContent: 'center' }} hitSlop={8} onPress={onResend}>
                                <Text style={text.link}>Resend code</Text>
                            </Pressable>
                        )}
                    </View>
                </Gutter>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
