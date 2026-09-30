import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { Button, Card, Radio } from '@/components/ui';
import { toast } from '@/components/Toast';
import { isPast, WhenPicker } from '@/components/WhenPicker';
import { NetworkError, ApiError } from '@/api/client';
import { captionSettings, deletePost, newIdempotencyKey, publishPost } from '@/api/posts';
import { platformLabel } from '@/api/channels';
import { refreshAfterPublish, replaceCachedPost, useChannels } from '@/api/resources';
import { color, font, scrim, shadow, space, text } from '@/theme';

type Mode = 'now' | 'schedule' | 'draft';

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
    const params = useLocalSearchParams<{
        text?: string;
        accountIds?: string;
        captions?: string;
        media?: string;
        draftId?: string;
    }>();
    const text_ = params.text ?? '';
    // Per-platform captions from compose, as JSON — route params are strings.
    const platformSettings = captionSettings(parseCaptions(params.captions));
    const accountIds = (params.accountIds ?? '').split(',').filter(Boolean);
    // Already uploaded by compose — these are Bunny urls, not local files.
    const media = parseMedia(params.media);
    const channels = useChannels();
    const platforms = [
        ...new Set(
            (channels.data?.channels ?? []).filter((c) => accountIds.includes(c.id)).map((c) => c.platform),
        ),
    ];

    // A reopened draft has nothing to be a draft of but itself — saving it
    // again is compose's job — so the sheet only offers now or later.
    const [mode, setMode] = useState<Mode>('schedule');
    const [when, setWhen] = useState<Date>(defaultSlot);
    const [sending, setSending] = useState(false);
    const key = useRef(newIdempotencyKey());

    const submit = async () => {
        if (sending) return;
        if (accountIds.length === 0 || (!text_ && !platformSettings && media.length === 0)) {
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
                    accountIds,
                    status: mode === 'now' ? 'published' : mode === 'schedule' ? 'scheduled' : 'draft',
                    scheduledAt: mode === 'schedule' ? when.toISOString() : undefined,
                    platformSettings,
                    ...(media.length ? { media } : {}),
                },
                key.current,
            );
            // The post exists now, so the draft it came from is spent. Zernio
            // cannot turn a draft into a live post in place — PATCH takes only
            // text and time — so publishing one is create-then-delete. A failed
            // delete leaves a stale draft behind, which is untidy but harmless;
            // failing the publish over it would be neither.
            if (params.draftId) {
                try {
                    await deletePost(params.draftId);
                    replaceCachedPost(params.draftId, null);
                } catch {
                    refreshAfterPublish();
                }
            } else {
                refreshAfterPublish();
            }
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
                                {mode === 'schedule' ? <WhenPicker value={when} onChange={setWhen} /> : null}
                            </View>
                        </Card>
                    </Pressable>

                    {params.draftId ? null : (
                        <Option
                            icon="file"
                            title="Save as draft"
                            sub="Park it, finish it later"
                            selected={mode === 'draft'}
                            onPress={() => setMode('draft')}
                        />
                    )}
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

/**
 * The attachments compose uploaded, as they came through the route param.
 *
 * Validated rather than trusted: a param is a string that survived a navigation,
 * and a malformed one should cost the attachments, not the post.
 */
function parseMedia(raw: string | undefined): { url: string; type: 'image' | 'video' | 'gif' }[] {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (item): item is { url: string; type: 'image' | 'video' | 'gif' } =>
                Boolean(item) &&
                typeof item === 'object' &&
                typeof (item as { url?: unknown }).url === 'string' &&
                ['image', 'video', 'gif'].includes((item as { type?: unknown }).type as string),
        );
    } catch {
        return [];
    }
}

function parseCaptions(raw: string | undefined): Record<string, string> {
    if (!raw) return {};
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
    } catch {
        return {};
    }
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
