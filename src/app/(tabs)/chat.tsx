import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { useCommentedPosts, useConversations } from '@/api/resources';
import { groupPosts, type Conversation, type PostGroup } from '@/api/inbox';
import { platformColor, platformLabel } from '@/api/channels';
import { PersonAvatar, PlatformDot } from '@/components/InboxBits';
import { relativeLabel } from '@/api/format';
import { color, font, radius, shadow, space, text, tone, HIT } from '@/theme';

type Tab = 'messages' | 'comments';

/**
 * Chat — the kitchen's social inbox. Messages: DMs across every connected
 * account. Comments: every post on those accounts that has comments, whether
 * or not it was posted from Spoof Kitchen, each opening to its comments.
 *
 * A Pro feature; below Pro the studio refuses with 402 and both lists come back
 * `locked`, which this screen answers with the upgrade card.
 */
export default function Chat() {
    const [tab, setTab] = useState<Tab>('messages');
    const [platform, setPlatform] = useState<string>('all');
    const [refreshing, setRefreshing] = useState(false);
    const conversations = useConversations();
    const posts = useCommentedPosts();

    const active = tab === 'messages' ? conversations : posts;
    const locked = conversations.data?.locked || posts.data?.locked;
    const convs = conversations.data && !conversations.data.locked ? conversations.data.items : [];
    const groups = posts.data && !posts.data.locked ? groupPosts(posts.data.items) : [];

    // Filter chips: only platforms that actually appear, in either list.
    const platforms = [
        ...new Set([...convs.map((c) => c.platform), ...groups.flatMap((g) => g.entries.map((e) => e.platform))]),
    ].filter(Boolean);
    const shownConvs = convs.filter((c) => platform === 'all' || c.platform === platform);
    const shownGroups = groups.filter((g) => platform === 'all' || g.entries.some((e) => e.platform === platform));

    const unread = convs.reduce((n, c) => n + c.unreadCount, 0);
    const failed = active.data && !active.data.locked ? active.data.failedAccounts : [];

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([conversations.refresh(), posts.refresh()]);
        setRefreshing(false);
    };

    return (
        <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.muted} />}>
            <View style={{ paddingHorizontal: space.gutter, gap: 14 }}>
                <View style={{ gap: 2 }}>
                    <Text style={[text.displayXl, { lineHeight: 51 }]}>Chat</Text>
                    <Text style={[text.meta, { fontFamily: font.bold, fontSize: 13, color: color.muted }]}>
                        {locked ? 'Your DMs and comments, in one place' : unread ? `${unread} unread ${unread === 1 ? 'message' : 'messages'}` : 'DMs and comments across your accounts'}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: tone.sand }}>
                    <TabButton label="Messages" count={unread} on={tab === 'messages'} onPress={() => setTab('messages')} />
                    <TabButton label="Comments" on={tab === 'comments'} onPress={() => setTab('comments')} />
                </View>
            </View>

            {platforms.length > 1 && !locked ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flexGrow: 0, marginTop: 12 }}
                    contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }}
                >
                    <FilterChip label="All" on={platform === 'all'} onPress={() => setPlatform('all')} />
                    {platforms.map((p) => (
                        <FilterChip key={p} platform={p} label={platformLabel(p)} on={platform === p} onPress={() => setPlatform(p)} />
                    ))}
                </ScrollView>
            ) : null}

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 14, gap: 8 }}>
                {locked ? <Locked /> : null}

                {!locked && !active.data && active.status !== 'error' ? <Loading label={tab === 'messages' ? 'Fetching your DMs…' : 'Fetching comments…'} /> : null}
                {!locked && active.status === 'error' && !active.data ? <Failed message={active.error} onRetry={active.refresh} /> : null}

                {failed.length ? (
                    <Text style={[text.meta, { fontFamily: font.semibold, color: color.muted }]}>
                        {`Couldn’t reach ${failed.map(platformLabel).join(', ')} just now — pull to try again.`}
                    </Text>
                ) : null}

                {!locked && tab === 'messages' && conversations.data ? (
                    shownConvs.length ? (
                        shownConvs.map((c) => <ConversationRow key={`${c.accountId}:${c.id}`} conversation={c} />)
                    ) : (
                        <Empty icon="chat" title="No messages yet" body="DMs to your connected accounts land here." />
                    )
                ) : null}

                {!locked && tab === 'comments' && posts.data ? (
                    shownGroups.length ? (
                        <>
                            <Text style={[text.meta, { fontFamily: font.bold, color: color.muted, paddingBottom: 2 }]}>
                                Every post with comments across your accounts — old ones and ones posted outside the app too
                            </Text>
                            {shownGroups.map((g) => (
                                <PostCard key={g.key} group={g} />
                            ))}
                        </>
                    ) : (
                        <Empty icon="chat" title="No comments yet" body="When someone comments on one of your posts, it shows up here." />
                    )
                ) : null}
            </View>
        </Screen>
    );
}

function TabButton({ label, count, on, onPress }: { label: string; count?: number; on: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
                flex: 1,
                height: HIT,
                borderRadius: radius.pill,
                backgroundColor: on ? color.ink : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
            }}
        >
            <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: on ? color.white : color.muted }}>{label}</Text>
            {count ? (
                <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: on ? color.accent : color.inactive, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: font.extrabold, fontSize: 11, color: on ? color.ink : color.muted }}>{count}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

function FilterChip({ label, platform, on, onPress }: { label: string; platform?: string; on: boolean; onPress: () => void }) {
    const brand = platform ? (platformColor(platform) ?? color.ink) : color.ink;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
                height: HIT,
                paddingLeft: platform ? 6 : 16,
                paddingRight: 14,
                borderRadius: radius.pill,
                backgroundColor: on ? brand : color.surface,
                borderWidth: on ? 0 : 1.5,
                borderColor: color.fieldBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
            }}
        >
            {platform ? <PlatformDot platform={platform} size={30} inverted={on} /> : null}
            <Text style={{ fontFamily: font.extrabold, fontSize: 13.5, color: on ? color.white : color.ink }}>{label}</Text>
        </Pressable>
    );
}

function ConversationRow({ conversation: c }: { conversation: Conversation }) {
    const unread = c.unreadCount > 0;
    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: '/inbox/[conversationId]',
                    params: { conversationId: c.id, accountId: c.accountId, name: c.participantName, platform: c.platform, picture: c.participantPicture ?? '' },
                })
            }
            accessibilityRole="button"
            accessibilityLabel={`${c.participantName} on ${platformLabel(c.platform)}${unread ? `, ${c.unreadCount} unread` : ''}`}
            style={({ pressed }) => [
                {
                    minHeight: 72,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 22,
                    backgroundColor: unread ? color.surface : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                },
                unread && shadow.lift,
            ]}
        >
            <PersonAvatar name={c.participantName} picture={c.participantPicture} platform={c.platform} />
            <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>{c.participantName}</Text>
                    {c.updatedAt ? <Text style={[text.meta, { fontFamily: font.bold, color: color.muted }]}>{relativeLabel(c.updatedAt)}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: unread ? font.bold : font.semibold, fontSize: 13.5, color: unread ? color.ink : color.muted }}>
                        {c.lastMessage || 'New conversation'}
                    </Text>
                    {unread ? (
                        <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: color.brand, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontFamily: font.extrabold, fontSize: 11, color: color.white }}>{c.unreadCount}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </Pressable>
    );
}

function PostCard({ group: g }: { group: PostGroup }) {
    const total = g.entries.reduce((n, e) => n + e.commentCount, 0);
    return (
        <Pressable
            onPress={() => router.push({ pathname: '/inbox/post', params: { key: g.key } })}
            accessibilityRole="button"
            accessibilityLabel={`${g.text || 'Post'}. ${total} comments`}
            style={({ pressed }) => [
                { padding: 10, borderRadius: 22, backgroundColor: color.surface, gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] },
                shadow.lift,
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 62, height: 62, borderRadius: 16, overflow: 'hidden', backgroundColor: g.picture ? tone.sand : color.ink, alignItems: 'center', justifyContent: 'center' }}>
                    {g.picture ? (
                        <Image source={{ uri: g.picture }} style={{ width: 62, height: 62 }} contentFit="cover" />
                    ) : (
                        <Text style={{ fontFamily: font.serif, fontSize: 34, lineHeight: 39, color: color.white }}>“</Text>
                    )}
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                    <Text numberOfLines={2} style={{ fontFamily: font.extrabold, fontSize: 14.5, lineHeight: 19, color: color.ink }}>
                        {g.text || 'Post with no caption'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        {g.entries.map((e) => (
                            <View key={`${e.platform}:${e.id}`} style={{ height: 24, paddingLeft: 3, paddingRight: 8, borderRadius: radius.pill, backgroundColor: tone.sand, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <PlatformDot platform={e.platform} size={18} />
                                <Text style={[text.badge, { color: color.ink }]}>{`${e.commentCount} ${e.commentCount === 1 ? 'comment' : 'comments'}`}</Text>
                            </View>
                        ))}
                    </View>
                </View>
                <Icon name="chevronRight" size={16} tint={color.inactiveFg} weight={2.6} />
            </View>
            {g.createdAt ? (
                <Text style={[text.meta, { fontFamily: font.semibold, color: color.muted, paddingLeft: 2 }]}>{`Posted ${relativeLabel(g.createdAt).toLowerCase()}`}</Text>
            ) : null}
        </Pressable>
    );
}

function Locked() {
    return (
        <View style={{ marginTop: 6, padding: 20, borderRadius: 26, backgroundColor: color.ink, gap: 12, transform: [{ rotate: '-1deg' }] }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chat" size={24} tint={color.ink} weight={2.2} />
            </View>
            <Text style={{ fontFamily: font.serif, fontSize: 26, lineHeight: 30, color: color.white }}>Every DM and comment, in one pocket</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 13.5, lineHeight: 19, color: color.inactive }}>
                The inbox comes with Pro. Reply to Instagram, Facebook, X and LinkedIn without switching apps.
            </Text>
            <Pressable
                onPress={() => router.push('/billing')}
                accessibilityRole="button"
                style={{ height: 48, borderRadius: radius.pill, backgroundColor: color.white, alignItems: 'center', justifyContent: 'center' }}
            >
                <Text style={{ fontFamily: font.extrabold, fontSize: 14.5, color: color.brand }}>See Pro</Text>
            </Pressable>
        </View>
    );
}
