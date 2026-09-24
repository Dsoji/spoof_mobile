import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { PostRow, PostTile } from '@/components/PostRow';
import { toast } from '@/components/Toast';
import { loadMorePosts, usePosts, type PostFilter } from '@/api/resources';
import type { Post } from '@/api/posts';
import { color, font, radius, space, text, tone, HIT } from '@/theme';

const FILTERS: { value: PostFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Drafts' },
    { value: 'failed', label: 'Failed' },
];

const EMPTY: Record<PostFilter, { title: string; body: string }> = {
    all: { title: 'No posts yet', body: 'Anything you publish, schedule or save shows up here.' },
    scheduled: { title: 'Nothing queued', body: 'Posts you schedule wait here until they go out.' },
    published: { title: 'Nothing published yet', body: 'Posts that have gone out land here.' },
    draft: { title: 'No drafts', body: 'Save a post as a draft to finish it later.' },
    failed: { title: 'Nothing failed', body: 'If a platform turns a post down, it shows up here with the reason.' },
};

/** The list view's groups, in the order they matter: what needs you, what is next, what is waiting, what is done. */
const GROUPS: { status: string; title: string; bg: string; fg: string }[] = [
    { status: 'failed', title: 'Needs a fix', bg: color.dangerBg, fg: color.danger },
    { status: 'scheduled', title: 'Coming up', bg: color.brandTint, fg: color.chipSelectedFg },
    { status: 'draft', title: 'On the stove', bg: tone.sand, fg: color.muted },
    { status: 'published', title: 'Out in the world', bg: color.successBg, fg: color.success },
];

const GRID_GAP = 3;

/**
 * Every post in the kitchen, by status — as a list grouped by where each post
 * stands, or as a grid of what they look like.
 *
 * A pushed screen off Home rather than a fifth tab: the app's scope is notes
 * first, and the posts list is where you go to check on something, not where
 * you spend the day.
 */
export default function Posts() {
    const [filter, setFilter] = useState<PostFilter>('all');
    const [view, setView] = useState<'list' | 'grid'>('list');
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const { width } = useWindowDimensions();
    const posts = usePosts(filter);
    const list = posts.data?.posts ?? [];

    const onRefresh = async () => {
        setRefreshing(true);
        await posts.refresh();
        setRefreshing(false);
    };

    const onMore = async () => {
        if (loadingMore) return;
        setLoadingMore(true);
        try {
            await loadMorePosts(filter);
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not load more posts.');
        } finally {
            setLoadingMore(false);
        }
    };

    // Counts describe what is loaded, not the kitchen's lifetime totals — the
    // list is paged and there is no count endpoint.
    const counted = (status: string) => list.filter((p) => p.status === status).length;
    const summary = [
        counted('published') ? `${counted('published')} out` : null,
        counted('scheduled') ? `${counted('scheduled')} coming up` : null,
        counted('draft') ? `${counted('draft')} on the stove` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    const tile = (width - space.gutter * 2 - GRID_GAP * 2) / 3;
    const rows: Post[][] = [];
    for (let i = 0; i < list.length; i += 3) rows.push(list.slice(i, i + 3));

    return (
        <Screen
            scroll
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.muted} />}
        >
            <View style={{ paddingHorizontal: space.gutter, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Pressable
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                        style={{ width: HIT, height: HIT, borderRadius: HIT / 2, backgroundColor: tone.sand, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Icon name="chevronLeft" size={18} tint={color.ink} weight={2.6} />
                    </Pressable>
                    <View style={{ flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: color.ink }}>
                        <ViewToggle icon="list" label="List view" on={view === 'list'} onPress={() => setView('list')} />
                        <ViewToggle icon="grid" label="Grid view" on={view === 'grid'} onPress={() => setView('grid')} />
                    </View>
                </View>
                <View style={{ gap: 2 }}>
                    <Text style={[text.displayXl, { lineHeight: 51 }]}>Posts</Text>
                    {summary ? <Text style={[text.meta, { fontFamily: font.bold, fontSize: 13, color: color.muted }]}>{summary}</Text> : null}
                </View>
            </View>

            {/* Five filters do not fit a phone's width, so the row scrolls
                rather than wrapping onto a second line. */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginTop: 14 }}
                contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }}
            >
                {FILTERS.map((f) => {
                    const on = f.value === filter;
                    return (
                        <Pressable
                            key={f.value}
                            onPress={() => setFilter(f.value)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: on }}
                            style={{
                                height: HIT,
                                paddingHorizontal: 16,
                                borderRadius: radius.pill,
                                backgroundColor: on ? color.ink : color.surface,
                                borderWidth: on ? 0 : 1.5,
                                borderColor: color.fieldBorder,
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ fontFamily: font.extrabold, fontSize: 13.5, color: on ? color.white : color.ink }}>{f.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 16 }}>
                {posts.status === 'loading' || (posts.status === 'idle' && !posts.data) ? <Loading label="Fetching your posts…" /> : null}
                {posts.status === 'error' && !posts.data ? <Failed message={posts.error} onRetry={posts.refresh} /> : null}
                {posts.data && list.length === 0 ? <Empty icon="send" title={EMPTY[filter].title} body={EMPTY[filter].body} /> : null}

                {view === 'list' ? (
                    <View style={{ gap: 18 }}>
                        {GROUPS.map((g) => {
                            const group = list.filter((p) => p.status === g.status);
                            if (!group.length) return null;
                            return (
                                <View key={g.status} style={{ gap: 10 }}>
                                    {/* A single filter is already one group; its heading would only repeat the chip. */}
                                    {filter === 'all' ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ fontFamily: font.serif, fontSize: 22, lineHeight: 26, color: color.ink }}>{g.title}</Text>
                                            <View style={{ minWidth: 24, height: 24, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: g.bg, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ fontFamily: font.extrabold, fontSize: 11.5, color: g.fg }}>{group.length}</Text>
                                            </View>
                                        </View>
                                    ) : null}
                                    {group.map((p) => (
                                        <PostRow key={p.id} post={p} />
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View style={{ gap: GRID_GAP, borderRadius: 20, overflow: 'hidden' }}>
                        {rows.map((row) => (
                            <View key={row[0].id} style={{ flexDirection: 'row', gap: GRID_GAP }}>
                                {row.map((p) => (
                                    <PostTile key={p.id} post={p} size={tile} />
                                ))}
                            </View>
                        ))}
                    </View>
                )}

                {posts.data?.more ? (
                    <Pressable
                        onPress={onMore}
                        disabled={loadingMore}
                        accessibilityRole="button"
                        style={{
                            minHeight: HIT,
                            marginTop: 16,
                            borderRadius: radius.pill,
                            backgroundColor: color.ink,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.white }}>{loadingMore ? 'Loading…' : 'Show more'}</Text>
                    </Pressable>
                ) : null}
            </View>
        </Screen>
    );
}

function ViewToggle({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: on }}
            style={{ width: HIT, height: 36, borderRadius: radius.pill, backgroundColor: on ? color.white : 'transparent', alignItems: 'center', justifyContent: 'center' }}
            hitSlop={4}
        >
            <Icon name={icon} size={18} tint={on ? color.brand : color.inactiveFg} weight={2.4} />
        </Pressable>
    );
}
