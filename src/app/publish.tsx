import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Icon, type IconName } from '@/components/Icon';
import { Button, Card, Radio } from '@/components/ui';
import { toast } from '@/components/Toast';
import { NetworkError, ApiError } from '@/api/client';
import { newIdempotencyKey, publishPost } from '@/api/posts';
import { platformLabel } from '@/api/channels';
import { refreshAfterPublish } from '@/api/resources';
import { color, font, radius, scrim, shadow, space, text } from '@/theme';

type Mode = 'now' | 'schedule' | 'draft';

function isPast(date: Date): boolean {
    return date.getTime() <= Date.now();
}

/** Tomorrow at 9:00 — a sensible first guess for "schedule", and always in the future. */
function defaultSlot(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
}

/**
 * All three states are one call — `publishPost(status)` — so this is a choice,
 * not three code paths.
 *
 * The idempotency key belongs to one ATTEMPT. A tap after a network failure
 * reuses it, so if the first request did reach the studio and published, the
 * retry gets that post back instead of posting twice to a real audience. A tap
 * after a real answer from the studio — a rejection, a limit — is a new
 * decision and gets a new key.
 */
export default function Publish() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ text?: string; platforms?: string }>();
    const text_ = params.text ?? '';
    const platforms = (params.platforms ?? '').split(',').filter(Boolean);

    const [mode, setMode] = useState<Mode>('schedule');
    const [when, setWhen] = useState<Date>(defaultSlot);
    const [picker, setPicker] = useState<'date' | 'time' | null>(null);
    const [sending, setSending] = useState(false);
    const key = useRef(newIdempotencyKey());

    const onPicked = (event: DateTimePickerEvent, value?: Date) => {
        // Android shows the picker as a dialog that closes itself; iOS renders
        // it inline and stays put.
        if (Platform.OS === 'android') setPicker(null);
        if (event.type === 'set' && value) setWhen(value);
    };

    const submit = async () => {
        if (sending) return;
        if (platforms.length === 0 || !text_) {
            toast('Nothing to post — go back and write something.');
            return;
        }
        if (mode === 'schedule' && isPast(when)) {
            toast('That time has already passed. Pick a time in the future.');
            return;
        }

        setSending(true);
        try {
            await publishPost(
                {
                    text: text_,
                    platforms,
                    status: mode === 'now' ? 'published' : mode === 'schedule' ? 'scheduled' : 'draft',
                    scheduledAt: mode === 'schedule' ? when.toISOString() : undefined,
                },
                key.current,
            );
            refreshAfterPublish();
            toast(mode === 'now' ? 'Posted.' : mode === 'schedule' ? 'Scheduled.' : 'Draft saved.', 'success');
            router.dismissAll();
        } catch (e) {
            if (e instanceof NetworkError) {
                // The request may or may not have arrived. Same key on the next
                // tap: if it did, the studio hands back that post, not a new one.
                toast('We couldn’t confirm that went through. Tap again to retry safely.');
            } else {
                // 409 means this attempt is still being processed — keep the key
                // and let the retry join it. Anything else is a definite answer.
                if (!(e instanceof ApiError && e.status === 409)) key.current = newIdempotencyKey();
                toast(e instanceof Error ? e.message : 'Could not publish.');
            }
        } finally {
            setSending(false);
        }
    };

    const dayLabel = when.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const timeLabel = when.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });

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
                    <Text style={text.eyebrow}>{platforms.map(platformLabel).join(' · ')}</Text>
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
                                            <Field label={dayLabel} grow active={picker === 'date'} onPress={() => setPicker(picker === 'date' ? null : 'date')} />
                                            <Field label={timeLabel} active={picker === 'time'} onPress={() => setPicker(picker === 'time' ? null : 'time')} />
                                        </View>
                                        {picker ? (
                                            <DateTimePicker
                                                value={when}
                                                mode={picker}
                                                display={Platform.OS === 'ios' ? (picker === 'date' ? 'inline' : 'spinner') : 'default'}
                                                minimumDate={picker === 'date' ? new Date() : undefined}
                                                minuteInterval={5}
                                                onChange={onPicked}
                                                accentColor={color.brand}
                                                themeVariant="light"
                                            />
                                        ) : null}
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
                    label={
                        mode === 'now'
                            ? 'Post now'
                            : mode === 'draft'
                              ? 'Save draft'
                              : `Schedule for ${when.toLocaleString(undefined, { weekday: 'long' })}`
                    }
                    loading={sending}
                    onPress={submit}
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

function Field({ label, grow, active, onPress }: { label: string; grow?: boolean; active?: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={{
                flex: grow ? 1 : undefined,
                width: grow ? undefined : 116,
                height: 48,
                borderRadius: radius.cta,
                backgroundColor: active ? color.brandTint : color.field,
                borderWidth: 1,
                borderColor: active ? color.brand : color.fieldBorder,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: active ? color.brand : color.ink }}>{label}</Text>
        </Pressable>
    );
}
