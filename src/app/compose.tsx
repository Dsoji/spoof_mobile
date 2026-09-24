import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, Screen } from '@/components/ui';
import { Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { useChannels, useMe, refreshAfterPublish, replaceCachedPost } from '@/api/resources';
import { captionLimit, DEFAULT_CAPTION_LIMIT, platformColor, platformLabel, platformMark, type Channel } from '@/api/channels';
import { initialOf } from '@/api/me';
import { NetworkError } from '@/api/client';
import { captionSettings, newIdempotencyKey, publishPost, updatePost } from '@/api/posts';
import { relativeLabel } from '@/api/format';
import { color, font, radius, shadow, space, text, tone, HIT } from '@/theme';

/**
 * Write a post.
 *
 * Posting targets are the kitchen's connected accounts, not platforms: a
 * kitchen can hold two Instagram accounts, and "Instagram" does not say which.
 *
 * One caption goes everywhere, and any platform can have its own instead —
 * keyed by platform, the way the studio stores it, so two Instagram accounts
 * share one Instagram caption. Each is counted against that platform's limit.
 *
 * With `postId` this reopens an existing post. A draft can be edited and then
 * published; a scheduled post can only have its text changed, because the
 * studio's PATCH takes text and time and nothing else — its accounts are fixed.
 * For the same reason per-platform captions are only offered on a new post:
 * PATCH could not save them.
 *
 * No AI rewrite and no media yet. Neither has a mobile endpoint behind it, and
 * a button that does nothing is worse than no button.
 */
export default function Compose() {
    const params = useLocalSearchParams<{
        text?: string;
        noteId?: string;
        noteCreatedAt?: string;
        postId?: string;
        postStatus?: string;
    }>();
    const channels = useChannels();
    const me = useMe();

    const editingScheduled = Boolean(params.postId) && params.postStatus === 'scheduled';
    const editingDraft = Boolean(params.postId) && !editingScheduled;

    const [caption, setCaption] = useState(params.text ?? '');
    /** Per-platform captions the user has typed. Absent means "use the main caption". */
    const [captions, setCaptions] = useState<Record<string, string>>({});
    /** Which caption the field is editing: null is the main one. */
    const [tab, setTab] = useState<string | null>(null);
    const [selected, setSelected] = useState<string[] | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);
    const draftKey = useRef(newIdempotencyKey());

    const accounts = (channels.data?.channels ?? []).filter((c) => c.active);
    const accountIds = accounts.map((c) => c.id);

    // `null` until the user touches the picker, and it means "every connected
    // account" — the common case is posting everywhere you can. Derived rather
    // than copied into state by an effect, so channels arriving late cannot
    // overwrite a choice the user has already made.
    const chosen = selected ?? accountIds;
    const toggle = (id: string) =>
        setSelected((prev) => {
            const list = prev ?? accountIds;
            return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        });

    // The platforms this post is going to — the caption tabs.
    const platforms = params.postId
        ? []
        : [...new Set(accounts.filter((a) => chosen.includes(a.id)).map((a) => a.platform))];
    // A tab for a platform that has since been deselected falls back to the main caption.
    const activeTab = tab && platforms.includes(tab) ? tab : null;

    // Only captions that actually differ are sent; a platform tab left as the
    // main caption is not an override.
    const custom = Object.fromEntries(
        platforms.filter((p) => captions[p] !== undefined && captions[p].trim() !== caption.trim()).map((p) => [p, captions[p]]),
    );
    const textFor = (p: string) => custom[p] ?? caption;

    // Every platform must end up with something to post, within its own limit.
    const tooLong = platforms.filter((p) => textFor(p).length > captionLimit(p));
    const empty = platforms.filter((p) => textFor(p).trim().length === 0);
    const mainFits = caption.length <= DEFAULT_CAPTION_LIMIT;
    const fits = platforms.length
        ? mainFits && tooLong.length === 0 && empty.length === 0
        : caption.trim().length > 0 && mainFits;
    // A scheduled post's accounts are already fixed, so only the text matters.
    const ready = fits && (editingScheduled || chosen.length > 0);

    const fieldValue = activeTab ? (captions[activeTab] ?? caption) : caption;
    // With one platform, the main caption IS that platform's, so it counts against its limit.
    const fieldLimit = activeTab
        ? captionLimit(activeTab)
        : platforms.length === 1
          ? Math.min(captionLimit(platforms[0]), DEFAULT_CAPTION_LIMIT)
          : DEFAULT_CAPTION_LIMIT;
    const onField = (next: string) => {
        if (activeTab) setCaptions((prev) => ({ ...prev, [activeTab]: next }));
        else setCaption(next);
    };
    const resetTab = () => {
        if (!activeTab) return;
        setCaptions(({ [activeTab]: _, ...rest }) => rest);
    };

    /** Save the text onto the existing post — a draft's "Draft", a scheduled post's only action. */
    const onSaveExisting = async () => {
        if (!params.postId || !fits || savingDraft) return;
        setSavingDraft(true);
        try {
            const post = await updatePost(params.postId, { text: caption.trim() });
            if (post) replaceCachedPost(params.postId, post);
            else refreshAfterPublish();
            toast('Saved.', 'success');
            router.back();
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not save that.');
        } finally {
            setSavingDraft(false);
        }
    };

    const onDraft = async () => {
        if (editingDraft) return onSaveExisting();
        if (!ready || savingDraft) return;
        setSavingDraft(true);
        try {
            await publishPost(
                { text: caption.trim(), accountIds: chosen, status: 'draft', platformSettings: captionSettings(custom) },
                draftKey.current,
            );
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

    const kitchen = me.data?.workspace.name;
    const source = params.noteId
        ? `From your note${params.noteCreatedAt ? ` · ${relativeLabel(params.noteCreatedAt).toLowerCase()}` : ''}`
        : activeTab
          ? `Just for ${platformLabel(activeTab)}`
          : platforms.length > 1
            ? 'Goes everywhere unless a platform has its own'
            : 'Your caption';

    return (
        <Screen
            scroll
            footer={
                editingScheduled ? (
                    <Button label="Save changes" loading={savingDraft} disabled={!fits} onPress={onSaveExisting} />
                ) : (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                            onPress={onDraft}
                            disabled={!ready || savingDraft}
                            accessibilityRole="button"
                            style={{
                                height: 56,
                                paddingHorizontal: 22,
                                borderRadius: radius.pill,
                                backgroundColor: tone.sand,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: ready ? 1 : 0.5,
                            }}
                        >
                            <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>
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
                                        params: {
                                            text: caption.trim(),
                                            accountIds: chosen.join(','),
                                            ...(Object.keys(custom).length ? { captions: JSON.stringify(custom) } : {}),
                                            ...(editingDraft && params.postId ? { draftId: params.postId } : {}),
                                        },
                                    })
                                }
                            />
                        </View>
                    </View>
                )
            }
        >
            <View style={{ paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[text.displayLg, { fontSize: 36, lineHeight: 42 }]}>
                    {editingScheduled ? 'Edit post' : editingDraft ? 'Edit draft' : 'New post'}
                </Text>
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    style={{ width: HIT, height: HIT, borderRadius: HIT / 2, backgroundColor: tone.sand, alignItems: 'center', justifyContent: 'center' }}
                >
                    <View style={{ transform: [{ rotate: '45deg' }] }}>
                        <Icon name="plus" size={22} tint={color.ink} weight={2.6} />
                    </View>
                </Pressable>
            </View>

            {editingScheduled ? null : (
                <View style={{ paddingHorizontal: space.gutter, paddingTop: 20, gap: 10 }}>
                    <Text style={{ fontFamily: font.serif, fontSize: 22, lineHeight: 26, color: color.ink }}>Where</Text>

                    {channels.status === 'loading' ? <Loading label="Fetching your channels…" /> : null}
                    {channels.status === 'error' && !channels.data ? (
                        <Failed message={channels.error} onRetry={channels.refresh} />
                    ) : null}

                    {channels.data && accounts.length === 0 ? (
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
                        {accounts.map((a) => (
                            <ChannelChip
                                key={a.id}
                                label={accountLabel(a, accounts)}
                                platform={a.platform}
                                on={chosen.includes(a.id)}
                                onPress={() => toggle(a.id)}
                            />
                        ))}
                    </View>
                </View>
            )}

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 22 }}>
                <View style={[{ backgroundColor: color.surface, borderRadius: 26, padding: 16, gap: 14 }, shadow.lift]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>{initialOf(me.data)}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 1 }}>
                            <Text numberOfLines={1} style={{ fontFamily: font.extrabold, fontSize: 14.5, color: color.ink }}>
                                {kitchen ?? 'Your kitchen'}
                            </Text>
                            <Text numberOfLines={1} style={[text.meta, { color: color.muted }]}>{source}</Text>
                        </View>
                    </View>

                    {/* One tab per platform, once there is more than one to tell apart.
                        A dot marks a platform with a caption of its own. */}
                    {platforms.length > 1 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            <CaptionTab label="Everywhere" on={activeTab === null} onPress={() => setTab(null)} />
                            {platforms.map((p) => (
                                <CaptionTab
                                    key={p}
                                    label={platformLabel(p)}
                                    on={activeTab === p}
                                    custom={custom[p] !== undefined}
                                    // An empty caption only needs flagging once there is a main one it failed to inherit.
                                    warn={tooLong.includes(p) || (empty.includes(p) && caption.trim().length > 0)}
                                    onPress={() => setTab(p)}
                                />
                            ))}
                        </View>
                    ) : null}

                    <TextInput
                        multiline
                        autoFocus={!params.text}
                        value={fieldValue}
                        onChangeText={onField}
                        placeholder={activeTab ? `What should ${platformLabel(activeTab)} see?` : 'What’s cooking?'}
                        placeholderTextColor={color.inactiveFg}
                        accessibilityLabel={activeTab ? `${platformLabel(activeTab)} caption` : 'Caption'}
                        style={{
                            fontFamily: font.semibold,
                            fontSize: 17,
                            lineHeight: 25,
                            color: color.ink,
                            textAlignVertical: 'top',
                            minHeight: 130,
                        }}
                    />

                    <View style={{ height: 1, backgroundColor: color.hairline }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
                        {activeTab && custom[activeTab] !== undefined ? (
                            <Pressable onPress={resetTab} accessibilityRole="button" hitSlop={10}>
                                <Text style={[text.link, { fontSize: 13 }]}>Use the main caption</Text>
                            </Pressable>
                        ) : (
                            <View />
                        )}
                        <Text
                            style={[
                                text.meta,
                                { fontFamily: font.bold, color: fieldValue.length > fieldLimit ? color.danger : color.muted },
                            ]}
                        >
                            {fieldValue.length} / {fieldLimit.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>

            {/* On the main caption, say which platforms it does not fit — tapping
                one opens that platform's tab to write a version that does. */}
            {activeTab === null && (tooLong.length > 0 || (caption.trim() && empty.length > 0)) ? (
                <View style={{ paddingHorizontal: space.gutter, paddingTop: 12, gap: 8 }}>
                    {tooLong.map((p) => (
                        <Warning
                            key={p}
                            label={`Too long for ${platformLabel(p)} (${captionLimit(p).toLocaleString()}). Write a ${platformLabel(p)} version`}
                            onPress={platforms.length > 1 ? () => setTab(p) : undefined}
                        />
                    ))}
                    {empty.map((p) => (
                        <Warning key={p} label={`${platformLabel(p)}’s caption is empty`} onPress={() => setTab(p)} />
                    ))}
                </View>
            ) : null}
        </Screen>
    );
}

function ChannelChip({ label, platform, on, onPress }: { label: string; platform: string; on: boolean; onPress: () => void }) {
    const brand = platformColor(platform) ?? color.ink;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={label}
            style={({ pressed }) => ({
                height: HIT,
                paddingLeft: 6,
                paddingRight: 12,
                borderRadius: radius.pill,
                backgroundColor: color.surface,
                borderWidth: 1.5,
                borderColor: on ? brand : color.fieldBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
        >
            <View
                style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: on ? brand : color.inactive,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text style={{ fontFamily: font.extrabold, fontSize: 12, color: on ? color.white : color.inactiveFg }}>
                    {platformMark(platform)}
                </Text>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: font.extrabold, fontSize: 13.5, color: on ? color.ink : color.muted }}>
                {label}
            </Text>
            {on ? <Icon name="check" size={14} tint={brand} weight={3} /> : null}
        </Pressable>
    );
}

function CaptionTab({
    label,
    on,
    custom,
    warn,
    onPress,
}: {
    label: string;
    on: boolean;
    custom?: boolean;
    warn?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${label}${custom ? ', own caption' : ''}${warn ? ', needs attention' : ''}`}
            style={{
                height: 36,
                paddingHorizontal: 13,
                borderRadius: radius.pill,
                backgroundColor: on ? color.ink : tone.sand,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
            }}
            hitSlop={4}
        >
            <Text style={{ fontFamily: font.extrabold, fontSize: 12.5, color: on ? color.white : color.ink }}>{label}</Text>
            {warn || custom ? (
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: warn ? color.danger : color.accent }} />
            ) : null}
        </Pressable>
    );
}

function Warning({ label, onPress }: { label: string; onPress?: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : 'text'}
            style={{
                minHeight: HIT,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 16,
                backgroundColor: color.dangerBg,
                borderWidth: 1,
                borderColor: color.dangerBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
            }}
        >
            <Icon name="info" size={16} tint={color.danger} weight={2.2} />
            <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: color.danger }}>{label}</Text>
            {onPress ? <Icon name="chevronRight" size={15} tint={color.danger} weight={2.4} /> : null}
        </Pressable>
    );
}

/**
 * "Instagram", or "Instagram · @studio" when the kitchen has more than one
 * Instagram — the platform alone stops being an answer to "which one?".
 */
function accountLabel(account: Channel, all: Channel[]): string {
    const platform = platformLabel(account.platform);
    const twins = all.filter((c) => c.platform === account.platform).length > 1;
    if (!twins) return platform;
    const who = account.handle ? `@${account.handle}` : account.name;
    return who ? `${platform} · ${who}` : platform;
}
