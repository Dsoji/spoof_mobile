import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, Gutter, IconButton, Screen } from '@/components/ui';
import { Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { useChannels, refreshAfterPublish } from '@/api/resources';
import { platformLabel } from '@/api/channels';
import { NetworkError } from '@/api/client';
import { newIdempotencyKey, publishPost } from '@/api/posts';
import { relativeLabel } from '@/api/format';
import { color, font, radius, text, HIT } from '@/theme';

/** Per-platform ceilings live in the web app's src/lib/platform-limits.ts. */
const LIMIT = 2200;

/**
 * Write a post.
 *
 * Posting targets are the kitchen's connected channels, not a fixed list: an
 * unconnected platform cannot be posted to, so offering it would only fail at
 * the last step.
 *
 * No AI rewrite and no media yet. The fixture this replaced drew both; neither
 * has a mobile endpoint behind it, and a button that does nothing is worse than
 * no button.
 */
export default function Compose() {
    const params = useLocalSearchParams<{ text?: string; noteId?: string; noteCreatedAt?: string }>();
    const channels = useChannels();

    const [caption, setCaption] = useState(params.text ?? '');
    const [selected, setSelected] = useState<string[] | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);
    const draftKey = useRef(newIdempotencyKey());

    const connected = (channels.data?.channels ?? []).filter((c) => c.active);
    const platforms = [...new Set(connected.map((c) => c.platform))];

    // `null` until the user touches the picker, and it means "every connected
    // platform" — the common case is posting everywhere you can. Derived rather
    // than copied into state by an effect, so channels arriving late cannot
    // overwrite a choice the user has already made.
    const chosen = selected ?? platforms;
    const toggle = (p: string) =>
        setSelected((prev) => {
            const list = prev ?? platforms;
            return list.includes(p) ? list.filter((x) => x !== p) : [...list, p];
        });

    const ready = caption.trim().length > 0 && chosen.length > 0 && caption.length <= LIMIT;

    const onDraft = async () => {
        if (!ready || savingDraft) return;
        setSavingDraft(true);
        try {
            await publishPost({ text: caption.trim(), platforms: chosen, status: 'draft' }, draftKey.current);
            refreshAfterPublish();
            toast('Draft saved.', 'success');
            router.dismissAll();
        } catch (e) {
            // Keep the key on a network failure so tapping again retries THIS
            // save; mint a new one after a real answer, which is a new attempt.
            if (!(e instanceof NetworkError)) draftKey.current = newIdempotencyKey();
            toast(e instanceof Error ? e.message : 'Could not save the draft.');
        } finally {
            setSavingDraft(false);
        }
    };

    return (
        <Screen
            scroll
            footer={
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                        onPress={onDraft}
                        disabled={!ready || savingDraft}
                        style={{
                            height: 56,
                            paddingHorizontal: 18,
                            borderRadius: 16,
                            backgroundColor: color.field,
                            borderWidth: 1,
                            borderColor: color.fieldBorder,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: ready ? 1 : 0.5,
                        }}
                    >
                        <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.muted }}>
                            {savingDraft ? 'Saving…' : 'Draft'}
                        </Text>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Button
                            label="Publish"
                            icon="arrowRight"
                            iconSide="trailing"
                            disabled={!ready}
                            onPress={() =>
                                router.push({
                                    pathname: '/publish',
                                    params: { text: caption.trim(), platforms: chosen.join(',') },
                                })
                            }
                        />
                    </View>
                </View>
            }
        >
            <Gutter style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />
                <Text style={[text.eyebrow, { fontSize: 12, letterSpacing: 1.7 }]}>New post</Text>
                <View style={{ width: HIT, height: HIT }} />
            </Gutter>

            <Gutter style={{ paddingTop: 22, gap: 10 }}>
                <Text style={text.eyebrow}>Posting to</Text>

                {channels.status === 'loading' ? <Loading label="Fetching your channels…" /> : null}
                {channels.status === 'error' && !channels.data ? (
                    <Failed message={channels.error} onRetry={channels.refresh} />
                ) : null}

                {channels.data && platforms.length === 0 ? (
                    <Pressable onPress={() => router.push('/onboarding/channels')}>
                        <Card padded={14}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                                <Icon name="plus" size={17} tint={color.brand} weight={2.2} />
                                <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14, color: color.ink }}>
                                    Connect a channel to post from here
                                </Text>
                                <Icon name="chevronRight" size={17} tint={color.inactiveFg} weight={2.2} />
                            </View>
                        </Card>
                    </Pressable>
                ) : null}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {platforms.map((p) => {
                        const on = chosen.includes(p);
                        return (
                            <Pressable
                                key={p}
                                onPress={() => toggle(p)}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: on }}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    height: HIT,
                                    paddingLeft: 8,
                                    paddingRight: 13,
                                    borderRadius: radius.pill,
                                    backgroundColor: on ? color.brandTint : color.surface,
                                    borderWidth: 1.5,
                                    borderColor: on ? color.brand : color.fieldBorder,
                                }}
                            >
                                <View
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: on ? color.brand : color.field,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ fontFamily: font.extrabold, fontSize: 11, color: on ? color.surface : color.subtle }}>
                                        {platformLabel(p).charAt(0)}
                                    </Text>
                                </View>
                                <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: on ? color.brand : color.muted }}>
                                    {platformLabel(p)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </Gutter>

            <Gutter style={{ paddingTop: 22 }}>
                <Card padded={18} style={{ borderRadius: radius.panel }}>
                    <View style={{ gap: 16 }}>
                        <TextInput
                            multiline
                            autoFocus={!params.text}
                            value={caption}
                            onChangeText={setCaption}
                            placeholder="What's cooking?"
                            placeholderTextColor={color.inactiveFg}
                            style={{
                                fontFamily: font.medium,
                                fontSize: 15,
                                lineHeight: 23,
                                color: color.ink,
                                textAlignVertical: 'top',
                                minHeight: 120,
                            }}
                        />
                        <View style={{ height: 1, backgroundColor: color.hairline }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <Text
                                style={[
                                    text.meta,
                                    { fontFamily: font.bold, fontSize: 11, color: caption.length > LIMIT ? color.danger : color.subtle },
                                ]}
                            >
                                {caption.length} / {LIMIT}
                            </Text>
                        </View>
                    </View>
                </Card>
            </Gutter>

            {params.noteId ? (
                <Gutter style={{ paddingTop: 20, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <Icon name="notes" size={14} tint={color.subtle} weight={2.1} />
                    <Text style={[text.meta, { fontFamily: font.semibold }]}>
                        {`From your note${params.noteCreatedAt ? ` · ${relativeLabel(params.noteCreatedAt).toLowerCase()}` : ''}`}
                    </Text>
                </Gutter>
            ) : null}
        </Screen>
    );
}
