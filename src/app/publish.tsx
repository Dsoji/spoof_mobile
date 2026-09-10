import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { Button, Card, Radio } from '@/components/ui';
import { color, font, radius, scrim, shadow, space, text } from '@/theme';

type Mode = 'now' | 'schedule' | 'draft';

/**
 * All three states are one call — `publishPost(status)` — so this is a choice,
 * not three code paths.
 *
 * A real build sends an idempotency key with it: on a flaky mobile connection a
 * request can time out at the client and still succeed at the server, and a
 * second tap would publish twice to a real audience.
 */
export default function Publish() {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<Mode>('schedule');

    return (
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ ...StyleSheetAbsolute, backgroundColor: scrim }} onPress={() => router.back()} />

            <View
                style={[
                    {
                        backgroundColor: color.cream,
                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                        paddingHorizontal: space.gutter,
                        paddingTop: 12,
                        paddingBottom: Math.max(insets.bottom, space.xl) + 14,
                        gap: 20,
                    },
                    shadow.sheet,
                ]}
            >
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: color.inactive, alignSelf: 'center' }} />

                <View style={{ gap: 7 }}>
                    <Text style={text.eyebrow}>Instagram · TikTok</Text>
                    <Text style={[text.display, { fontSize: 27, lineHeight: 32 }]}>When should this go out?</Text>
                </View>

                <View style={{ gap: 10 }}>
                    <Option
                        icon="send"
                        title="Post now"
                        sub="Out the door in seconds"
                        selected={mode === 'now'}
                        onPress={() => setMode('now')}
                    />

                    <Pressable onPress={() => setMode('schedule')}>
                        <Card selected={mode === 'schedule'} padded={0}>
                            <View style={{ paddingHorizontal: 16, paddingVertical: 15, gap: 14 }}>
                                <OptionRow
                                    icon="clock"
                                    title="Schedule"
                                    sub="Your queue posts it for you"
                                    selected={mode === 'schedule'}
                                />
                                {mode === 'schedule' ? (
                                    <>
                                        <View style={{ flexDirection: 'row', gap: 9 }}>
                                            <Field label="Fri, 11 Sep" grow />
                                            <Field label="9:00 AM" />
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                                            <Icon name="sparkle" size={13} tint={color.success} weight={2.2} />
                                            <Text style={{ fontFamily: font.bold, fontSize: 11.5, color: color.success }}>
                                                Your best window for Instagram
                                            </Text>
                                        </View>
                                    </>
                                ) : null}
                            </View>
                        </Card>
                    </Pressable>

                    <Option
                        icon="file"
                        title="Save as draft"
                        sub="Park it, finish it later"
                        selected={mode === 'draft'}
                        onPress={() => setMode('draft')}
                    />
                </View>

                <Button
                    label={mode === 'now' ? 'Post now' : mode === 'draft' ? 'Save draft' : 'Schedule for Friday'}
                    onPress={() => router.dismissAll()}
                />
            </View>
        </View>
    );
}

const StyleSheetAbsolute = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

function Option({
    icon,
    title,
    sub,
    selected,
    onPress,
}: {
    icon: IconName;
    title: string;
    sub: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable onPress={onPress}>
            <Card selected={selected} padded={0}>
                <View style={{ minHeight: 62, paddingHorizontal: 16, paddingVertical: 15 }}>
                    <OptionRow icon={icon} title={title} sub={sub} selected={selected} />
                </View>
            </Card>
        </Pressable>
    );
}

function OptionRow({
    icon,
    title,
    sub,
    selected,
}: {
    icon: IconName;
    title: string;
    sub: string;
    selected: boolean;
}) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: selected ? color.brandTint : color.field,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name={icon} size={19} tint={selected ? color.brand : color.muted} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>{title}</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: color.subtle }}>{sub}</Text>
            </View>
            <Radio selected={selected} />
        </View>
    );
}

function Field({ label, grow }: { label: string; grow?: boolean }) {
    return (
        <View
            style={{
                flex: grow ? 1 : undefined,
                width: grow ? undefined : 116,
                height: 48,
                borderRadius: radius.cta,
                backgroundColor: color.field,
                borderWidth: 1,
                borderColor: color.fieldBorder,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.ink }}>{label}</Text>
        </View>
    );
}
