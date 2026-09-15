import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon, SwirlMark, type IconName } from '@/components/Icon';
import { Badge, Card, Gutter, Screen, SectionHeader } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { useNotes } from '@/api/useNotes';
import { useActivity, useMe, useRecentPosts } from '@/api/resources';
import { firstName, initialOf } from '@/api/me';
import { platformLabel } from '@/api/channels';
import { postSortKey, postWhenLabel } from '@/api/posts';
import { greeting, todayEyebrow } from '@/api/format';
import { HANDOFF } from '@/theme/handoff';
import { useMarkLanded } from '@/lib/mark-handoff';
import { color, font, graphRamp, radius, shadow, text } from '@/theme';

/**
 * Home — streak, quick actions, recent notes, recent posts.
 *
 * Each band is one endpoint: activity, notes, posts. Two rows per list is
 * deliberate; the point is a glance, and "See all" is right there.
 */
export default function Home() {
    const { notes, status: noteStatus, error: noteError, refresh: refreshNotes } = useNotes();
    const me = useMe();
    const activity = useActivity();
    const posts = useRecentPosts();
    // Hidden until the splash mark finishes flying onto this spot.
    const landed = useMarkLanded();

    const name = firstName(me.data);
    // Fourteen empty squares while loading, rather than no strip: the card keeps
    // its shape, and nothing jumps when the real days arrive.
    const strip = activity.data ? activity.data.days.slice(-14).map((d) => d.level) : Array<number>(14).fill(0);
    const recent = [...(posts.data ?? [])].sort((a, b) => postSortKey(b).localeCompare(postSortKey(a))).slice(0, 2);

    return (
        <Screen scroll>
            <Gutter style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                    {/* Where the splash mark lands for a returning user, so its
                        size and offset come from the shared hand-off geometry
                        rather than being chosen here. */}
                    <View style={{ marginTop: HANDOFF.home.markTop, opacity: landed ? 1 : 0 }}>
                        <SwirlMark size={HANDOFF.home.markSize} />
                    </View>
                    <View style={{ gap: 5, flex: 1 }}>
                        <Text style={text.eyebrow}>{todayEyebrow()}</Text>
                        <Text numberOfLines={1} style={[text.displayLg, { fontSize: 30, lineHeight: 36 }]}>
                            {greeting()}
                            {name ? `, ${name}` : ''}
                        </Text>
                    </View>
                </View>
                <Avatar />
            </Gutter>

            {/* Streak. A 14-day strip, not the year grid — that lives on You,
                where there is room for 52 weeks. */}
            <Gutter style={{ paddingTop: 20 }}>
                <Pressable onPress={() => router.push('/(tabs)/you')}>
                    <Card padded={0}>
                        <View style={{ paddingHorizontal: 20, paddingTop: 17, paddingBottom: 18, gap: 15 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                                    <Text style={[text.display, { fontSize: 32, lineHeight: 38 }]}>
                                        {activity.data ? activity.data.streak : '–'}
                                    </Text>
                                    <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: color.muted }}>
                                        day streak
                                    </Text>
                                </View>
                                <Text style={[text.meta, { fontFamily: font.bold, fontSize: 11.5 }]}>
                                    {activity.status === 'error'
                                        ? 'Couldn’t load'
                                        : activity.data?.streak
                                          ? 'Keep it warm'
                                          : 'Jot something to start'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                {strip.map((lv, i) => (
                                    <View
                                        key={i}
                                        style={{ flex: 1, aspectRatio: 1, borderRadius: 4, backgroundColor: graphRamp[lv] }}
                                    />
                                ))}
                            </View>
                        </View>
                    </Card>
                </Pressable>
            </Gutter>

            {/* Two actions, because there are exactly two things you create: a note,
                or a post. Scheduling is a status picked at publish time on the same
                publishPost call — never a separate destination. */}
            <Gutter style={{ paddingTop: 14, flexDirection: 'row', gap: 10 }}>
                <QuickAction label="Jot a note" icon="plus" primary onPress={() => router.push('/capture')} />
                <QuickAction label="New post" icon="send" onPress={() => router.push('/compose')} />
            </Gutter>

            <Gutter style={{ paddingTop: 24, gap: 11 }}>
                <SectionHeader label="Recent notes" />
                <View style={{ gap: 9 }}>
                    {noteStatus === 'loading' ? <Loading label="Fetching your notes…" /> : null}
                    {noteStatus === 'error' ? <Failed message={noteError} onRetry={refreshNotes} /> : null}
                    {noteStatus === 'ready' && notes.length === 0 ? (
                        <Empty icon="plus" title="Nothing jotted yet" body="Your last two notes will sit here." />
                    ) : null}
                    {notes.slice(0, 2).map((n) => (
                        <Pressable key={n.id} onPress={() => router.push(`/note/${n.id}`)}>
                            <Card padded={0}>
                                <View
                                    style={{
                                        minHeight: 56,
                                        paddingHorizontal: 15,
                                        paddingVertical: 13,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 11,
                                    }}
                                >
                                    <Text numberOfLines={1} style={[text.bodySm, { flex: 1 }]}>
                                        {n.text}
                                    </Text>
                                    {n.remindLabel ? (
                                        <Icon name="clock" size={14} tint={color.brand} weight={2.2} />
                                    ) : null}
                                </View>
                            </Card>
                        </Pressable>
                    ))}
                </View>
            </Gutter>

            <Gutter style={{ paddingTop: 22, gap: 11 }}>
                <SectionHeader label="Recent posts" />
                <View style={{ gap: 9 }}>
                    {posts.status === 'loading' ? <Loading label="Fetching your posts…" /> : null}
                    {posts.status === 'error' && !posts.data ? <Failed message={posts.error} onRetry={posts.refresh} /> : null}
                    {posts.status === 'ready' && recent.length === 0 ? (
                        <Empty icon="send" title="No posts yet" body="Anything you publish or schedule shows up here." />
                    ) : null}
                    {recent.map((p) => {
                        const scheduled = p.status === 'scheduled';
                        return (
                            <Card key={p.id} padded={0}>
                                <View
                                    style={{
                                        minHeight: 64,
                                        paddingHorizontal: 13,
                                        paddingVertical: 11,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 12,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: radius.field,
                                            backgroundColor: scheduled ? color.brandTint : color.field,
                                            borderWidth: scheduled ? 0 : 1,
                                            borderColor: color.hairline,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Icon
                                            name={p.media.length ? 'image' : 'send'}
                                            size={18}
                                            tint={scheduled ? color.brand : color.muted}
                                            weight={1.9}
                                        />
                                    </View>
                                    <View style={{ flex: 1, gap: 5 }}>
                                        <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 13.5, color: color.ink }}>
                                            {p.text || 'Untitled post'}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                                            <Badge tone={p.status === 'published' ? 'success' : scheduled ? 'brand' : 'neutral'}>
                                                {p.status === 'published' ? 'Published' : postWhenLabel(p)}
                                            </Badge>
                                            <Text numberOfLines={1} style={[text.meta, { flex: 1, fontFamily: font.bold, fontSize: 10.5 }]}>
                                                {p.platforms.map((t) => platformLabel(t.platform)).join(' · ')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        );
                    })}
                </View>
            </Gutter>
        </Screen>
    );
}

export function Avatar() {
    const me = useMe();
    return (
        <Pressable
            onPress={() => router.push('/(tabs)/you')}
            accessibilityRole="button"
            accessibilityLabel="Your account"
            style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: color.brandTint,
                borderWidth: 1,
                borderColor: color.hairline,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: color.brand }}>{initialOf(me.data)}</Text>
        </Pressable>
    );
}

function QuickAction({
    label,
    icon,
    primary,
    onPress,
}: {
    label: string;
    icon: IconName;
    primary?: boolean;
    onPress?: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                {
                    flex: 1,
                    height: 84,
                    borderRadius: radius.card,
                    backgroundColor: primary ? color.brand : color.surface,
                    borderWidth: primary ? 0 : 1,
                    borderColor: color.hairline,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                },
                primary && shadow.cta,
            ]}
        >
            <Icon name={icon} size={21} tint={primary ? color.white : color.ink} weight={primary ? 2.2 : 2} />
            <Text
                style={{
                    fontFamily: font.extrabold,
                    fontSize: 11.5,
                    color: primary ? color.white : color.ink,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}
