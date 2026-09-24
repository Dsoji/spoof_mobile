import { useEffect, useMemo, useReducer, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { PersonAvatar, PlatformDot } from '@/components/InboxBits';
import { Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { commentedPostsResource, commentsFamily, findPostGroup, useMe } from '@/api/resources';
import { privateReply, reply, setHidden, setLiked, PRIVATE_REPLY_PLATFORMS, type Comment, type CommentedPost } from '@/api/inbox';
import { platformColor, platformLabel } from '@/api/channels';
import { relativeLabel } from '@/api/format';
import type { Resource } from '@/api/resource';
import { color, font, radius, space, text, tone, HIT } from '@/theme';

type Target =
    | { mode: 'post'; entry: CommentedPost }
    | { mode: 'reply' | 'private'; entry: CommentedPost; comment: Comment };

const entryKey = (e: CommentedPost) => `${e.accountId}|${e.id}`;

/**
 * Subscribe to several resources at once — one per platform post — and load
 * any that have not been. Hooks cannot be called in a loop, and the number of
 * platforms a post went to is only known at runtime.
 */
function useResources<T>(resources: Resource<T>[]) {
    const [, bump] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        const offs = resources.map((r) => r.subscribe(bump));
        resources.forEach((r) => {
            if (r.getState().status === 'idle') void r.refresh();
        });
        return () => offs.forEach((off) => off());
    }, [resources]);
    return resources.map((r) => r.getState());
}

/**
 * One post's comments, across every platform it went to.
 *
 * The same post on three platforms is three platform posts, each with its own
 * comments — so a tab per platform, plus All. Every action is sent AS the
 * kitchen's account on the platform the comment lives on.
 *
 * With nothing picked, the box comments on the post itself: the studio's reply
 * endpoint takes an optional comment, and without one the kitchen joins its
 * own thread.
 */
export default function PostComments() {
    const insets = useSafeAreaInsets();
    const { key } = useLocalSearchParams<{ key: string }>();
    const group = useMemo(() => findPostGroup(key), [key]);
    const me = useMe();

    const entries = useMemo(() => group?.entries ?? [], [group]);
    const resources = useMemo(() => entries.map((e) => commentsFamily.get(entryKey(e))), [entries]);
    const states = useResources(resources);

    const [tab, setTab] = useState<string>('all');
    const [target, setTarget] = useState<Target | null>(null);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);

    if (!group) {
        return (
            <View style={{ flex: 1, backgroundColor: color.cream, paddingTop: insets.top + space.xl, paddingHorizontal: space.gutter, gap: 16 }}>
                <BackButton />
                <Text style={[text.displayLg, { fontSize: 32, lineHeight: 37 }]}>That post isn’t loaded</Text>
                <Text style={text.bodyLg}>Go back to Chat and open it from the Comments list.</Text>
            </View>
        );
    }

    // Two accounts on one platform need telling apart in the tabs.
    const tabLabel = (e: CommentedPost) => {
        const twins = entries.filter((x) => x.platform === e.platform).length > 1;
        return twins && e.accountUsername ? `${platformLabel(e.platform)} · @${e.accountUsername}` : platformLabel(e.platform);
    };

    const shown = entries
        .map((e, i) => ({ entry: e, state: states[i], resource: resources[i] }))
        .filter((x) => tab === 'all' || entryKey(x.entry) === tab);
    const comments = shown
        .flatMap(({ entry, state }) => (state?.data ?? []).map((c) => ({ entry, comment: c })))
        .sort((a, b) => (b.comment.createdAt ?? '').localeCompare(a.comment.createdAt ?? ''));
    const loading = shown.some((x) => !x.state?.data && x.state?.status !== 'error');
    const failed = shown.filter((x) => x.state?.status === 'error' && !x.state.data);

    // Where a comment on the post itself would go: the selected tab's post, or the first.
    const postEntry = entries.find((e) => entryKey(e) === tab) ?? entries[0];
    const effective: Target = target ?? { mode: 'post', entry: postEntry };
    const kitchen = me.data?.workspace.name ?? 'your kitchen';

    const refreshEntry = (e: CommentedPost) => {
        void commentsFamily.get(entryKey(e)).refresh();
        // Comment counts on the Chat tab move with every reply.
        void commentedPostsResource.refresh();
    };

    const onSend = async () => {
        const message = draft.trim();
        if (!message || sending) return;
        setSending(true);
        try {
            if (effective.mode === 'post') await reply(effective.entry.id, effective.entry.accountId, message);
            else if (effective.mode === 'reply') await reply(effective.entry.id, effective.entry.accountId, message, effective.comment.id);
            else await privateReply(effective.entry.id, effective.comment.id, effective.entry.accountId, message);
            toast(effective.mode === 'private' ? 'Sent as a DM.' : 'Posted.', 'success');
            setDraft('');
            setTarget(null);
            refreshEntry(effective.entry);
        } catch (e) {
            // The platform's reason — "private replies must be sent within 7 days" — is worth showing as is.
            toast(e instanceof Error ? e.message : 'Could not send that.');
        } finally {
            setSending(false);
        }
    };

    const act = async (label: string, run: () => Promise<void>, entry: CommentedPost) => {
        try {
            await run();
            refreshEntry(entry);
        } catch (e) {
            toast(e instanceof Error ? e.message : `Could not ${label}.`);
        }
    };

    const targetLine =
        effective.mode === 'post'
            ? `Commenting on this post on ${platformLabel(effective.entry.platform)} as ${kitchen}`
            : effective.mode === 'reply'
              ? `Replying to ${effective.comment.authorName} on ${platformLabel(effective.entry.platform)} as ${kitchen}`
              : `Replying privately to ${effective.comment.authorName} — once, within 7 days`;

    const permalink = entries.find((e) => e.permalink)?.permalink;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.cream }}>
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: space.lg }} keyboardShouldPersistTaps="handled">
                <View style={{ paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <BackButton />
                    {permalink ? (
                        <Pressable
                            onPress={() => void Linking.openURL(permalink)}
                            accessibilityRole="link"
                            style={{ height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                            <Text style={{ fontFamily: font.extrabold, fontSize: 12.5, color: color.white }}>Open on platform</Text>
                            <Icon name="external" size={13} tint={color.white} weight={2.4} />
                        </Pressable>
                    ) : null}
                </View>

                <View style={{ paddingHorizontal: space.gutter, paddingTop: 12 }}>
                    <View style={{ borderRadius: 22, backgroundColor: color.brand, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, transform: [{ rotate: '-1deg' }] }}>
                        <View style={{ width: 60, height: 60, borderRadius: 16, overflow: 'hidden', backgroundColor: color.brandTint, alignItems: 'center', justifyContent: 'center' }}>
                            {group.picture ? (
                                <Image source={{ uri: group.picture }} style={{ width: 60, height: 60 }} contentFit="cover" />
                            ) : (
                                <Text style={{ fontFamily: font.serif, fontSize: 32, lineHeight: 37, color: color.brand }}>“</Text>
                            )}
                        </View>
                        <View style={{ flex: 1, gap: 5 }}>
                            <Text numberOfLines={3} style={{ fontFamily: font.serif, fontSize: 18, lineHeight: 22, color: color.white }}>
                                {group.text || 'Post with no caption'}
                            </Text>
                            <Text style={{ fontFamily: font.bold, fontSize: 11.5, color: color.brandWash }}>
                                {`${group.createdAt ? `Posted ${relativeLabel(group.createdAt).toLowerCase()} · ` : ''}${entries.map((e) => platformLabel(e.platform)).join(', ')}`}
                            </Text>
                        </View>
                    </View>
                </View>

                {entries.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 6 }}>
                        <PlatformTab label="All" count={entries.reduce((n, e) => n + e.commentCount, 0)} on={tab === 'all'} onPress={() => setTab('all')} />
                        {entries.map((e) => (
                            <PlatformTab
                                key={entryKey(e)}
                                platform={e.platform}
                                label={tabLabel(e)}
                                count={e.commentCount}
                                on={tab === entryKey(e)}
                                onPress={() => setTab(entryKey(e))}
                            />
                        ))}
                    </ScrollView>
                ) : null}

                <View style={{ paddingHorizontal: space.gutter, paddingTop: 12, gap: 10 }}>
                    {loading && comments.length === 0 ? <Loading label="Fetching comments…" /> : null}
                    {failed.map((x) => (
                        <Failed key={entryKey(x.entry)} message={`${platformLabel(x.entry.platform)}: ${x.state?.error ?? 'could not load comments.'}`} onRetry={x.resource.refresh} />
                    ))}
                    {!loading && comments.length === 0 && failed.length === 0 ? (
                        <View style={{ padding: 22, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: tone.orchid, backgroundColor: color.brandWash, alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>No comments here yet</Text>
                            <Text style={[text.meta, { textAlign: 'center', color: color.muted }]}>Start the conversation — your comment goes out as {kitchen}.</Text>
                        </View>
                    ) : null}

                    {comments.map(({ entry, comment }) => (
                        <CommentCard
                            key={`${entryKey(entry)}:${comment.id}`}
                            comment={comment}
                            targeted={target !== null && 'comment' in target && target.comment.id === comment.id}
                            onReply={() => setTarget({ mode: 'reply', entry, comment })}
                            onPrivate={
                                PRIVATE_REPLY_PLATFORMS.includes(entry.platform) && !comment.isOwner
                                    ? () => setTarget({ mode: 'private', entry, comment })
                                    : undefined
                            }
                            onLike={comment.canLike ? () => void act('like that', () => setLiked(entry.id, comment, entry.accountId, !comment.isLiked), entry) : undefined}
                            onHide={
                                comment.canHide && !comment.isOwner
                                    ? () => void act('hide that', () => setHidden(entry.id, comment.id, entry.accountId, !comment.isHidden), entry)
                                    : undefined
                            }
                        />
                    ))}
                </View>
            </ScrollView>

            <View style={{ paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md), gap: 8, borderTopWidth: 1, borderTopColor: color.hairline, backgroundColor: color.cream }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: platformColor(effective.entry.platform) ?? color.brand }} />
                    <Text numberOfLines={2} style={{ flex: 1, fontFamily: font.extrabold, fontSize: 12, color: color.chipSelectedFg }}>{targetLine}</Text>
                    {target ? (
                        <Pressable onPress={() => setTarget(null)} accessibilityRole="button" hitSlop={10}>
                            <Text style={[text.link, { fontSize: 12.5 }]}>Cancel</Text>
                        </Pressable>
                    ) : null}
                </View>
                {/* Commenting on a post that went to several platforms: pick which one. */}
                {!target && tab === 'all' && entries.length > 1 ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {entries.map((e) => (
                            <Pressable
                                key={entryKey(e)}
                                onPress={() => setTab(entryKey(e))}
                                accessibilityRole="button"
                                accessibilityLabel={`Comment on ${tabLabel(e)}`}
                                style={{ height: 36, paddingLeft: 4, paddingRight: 10, borderRadius: radius.pill, backgroundColor: e === postEntry ? color.brandTint : tone.sand, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                            >
                                <PlatformDot platform={e.platform} size={26} />
                                <Text style={[text.badge, { fontSize: 11.5, color: color.ink }]}>{platformLabel(e.platform)}</Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}
                <View style={{ minHeight: 56, borderRadius: 28, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.fieldBorder, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 18, paddingRight: 6, paddingVertical: 5, gap: 6 }}>
                    <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        multiline
                        placeholder={effective.mode === 'private' ? 'Send a DM…' : effective.mode === 'reply' ? 'Write a public reply…' : 'Comment on this post…'}
                        placeholderTextColor={color.inactiveFg}
                        accessibilityLabel={targetLine}
                        style={{ flex: 1, minHeight: 44, maxHeight: 120, paddingTop: 12, fontFamily: font.semibold, fontSize: 15, color: color.ink }}
                    />
                    <Pressable
                        onPress={onSend}
                        disabled={!draft.trim() || sending}
                        accessibilityRole="button"
                        accessibilityLabel="Send"
                        style={{ width: HIT, height: HIT, borderRadius: HIT / 2, backgroundColor: draft.trim() && !sending ? color.brand : color.inactive, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <View style={{ transform: [{ rotate: '-90deg' }] }}>
                            <Icon name="arrowRight" size={18} tint={color.white} weight={2.6} />
                        </View>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

function BackButton() {
    return (
        <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ width: HIT, height: HIT, borderRadius: HIT / 2, backgroundColor: tone.sand, alignItems: 'center', justifyContent: 'center' }}
        >
            <Icon name="chevronLeft" size={18} tint={color.ink} weight={2.6} />
        </Pressable>
    );
}

function PlatformTab({ label, platform, count, on, onPress }: { label: string; platform?: string; count: number; on: boolean; onPress: () => void }) {
    const brand = platform ? (platformColor(platform) ?? color.ink) : color.ink;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
                height: HIT,
                paddingLeft: platform ? 5 : 14,
                paddingRight: 6,
                borderRadius: radius.pill,
                backgroundColor: on ? brand : color.surface,
                borderWidth: on ? 0 : 1.5,
                borderColor: color.fieldBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
            }}
        >
            {platform ? <PlatformDot platform={platform} size={30} inverted={on} /> : null}
            <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: on ? color.white : color.ink }}>{label}</Text>
            <View style={{ minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: on ? color.white : tone.sand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: font.extrabold, fontSize: 11, color: on ? color.ink : color.muted }}>{count}</Text>
            </View>
        </Pressable>
    );
}

function ActionButton({ icon, label, onPress, active, dark }: { icon?: IconName; label?: string; onPress: () => void; active?: boolean; dark?: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label ?? icon}
            accessibilityState={{ selected: active }}
            hitSlop={4}
            style={{
                height: 36,
                minWidth: 36,
                paddingHorizontal: label ? 12 : 0,
                borderRadius: radius.pill,
                backgroundColor: dark ? color.ink : active ? color.dangerBg : tone.sand,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
            }}
        >
            {icon ? <Icon name={icon} size={15} tint={dark ? color.white : active ? color.danger : color.ink} weight={2.4} /> : null}
            {label ? <Text style={{ fontFamily: font.extrabold, fontSize: 12.5, color: dark ? color.white : color.ink }}>{label}</Text> : null}
        </Pressable>
    );
}

function CommentCard({
    comment: c,
    targeted,
    onReply,
    onPrivate,
    onLike,
    onHide,
}: {
    comment: Comment;
    targeted: boolean;
    onReply: () => void;
    onPrivate?: () => void;
    onLike?: () => void;
    onHide?: () => void;
}) {
    return (
        <View
            style={{
                padding: 12,
                borderRadius: 22,
                backgroundColor: color.surface,
                borderWidth: targeted ? 2 : 1,
                borderColor: targeted ? (platformColor(c.platform) ?? color.brand) : color.hairline,
                gap: 8,
                opacity: c.isHidden ? 0.55 : 1,
            }}
        >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <PersonAvatar name={c.authorName} picture={c.authorPicture} platform={c.platform} size={36} />
                <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.extrabold, fontSize: 14, color: color.ink }}>{c.isOwner ? 'You' : c.authorName}</Text>
                        {c.createdAt ? <Text style={[text.meta, { fontFamily: font.bold, fontSize: 11.5, color: color.muted }]}>{relativeLabel(c.createdAt)}</Text> : null}
                        {c.isHidden ? <Text style={[text.meta, { fontFamily: font.bold, fontSize: 11.5, color: color.muted }]}>· hidden</Text> : null}
                    </View>
                    <Text style={{ fontFamily: font.semibold, fontSize: 14.5, lineHeight: 20, color: color.ink }}>{c.text}</Text>
                </View>
            </View>

            {c.replies.map((r) => (
                <View key={r.id} style={{ marginLeft: 46, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16, borderBottomLeftRadius: 6, backgroundColor: r.isOwner ? color.brandTint : color.field, gap: 2 }}>
                    <Text style={{ fontFamily: font.extrabold, fontSize: 11.5, color: r.isOwner ? color.chipSelectedFg : color.muted }}>{r.isOwner ? 'You replied' : r.authorName}</Text>
                    <Text style={{ fontFamily: font.semibold, fontSize: 13.5, lineHeight: 18, color: color.ink }}>{r.text}</Text>
                </View>
            ))}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 46 }}>
                {onLike ? <ActionButton icon="heart" label={c.likeCount ? String(c.likeCount) : undefined} active={c.isLiked} onPress={onLike} /> : null}
                {c.canReply ? <ActionButton label="Reply" dark onPress={onReply} /> : null}
                {onPrivate ? <ActionButton label="Reply in DM" onPress={onPrivate} /> : null}
                {onHide ? <ActionButton icon="eyeOff" label={c.isHidden ? 'Unhide' : 'Hide'} onPress={onHide} /> : null}
            </View>
        </View>
    );
}
