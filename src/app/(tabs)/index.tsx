import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, SwirlMark, type IconName } from '@/components/Icon';
import { KitchenMenu } from '@/components/KitchenMenu';
import { Empty, Failed, Loading } from '@/components/ListState';
import { PostRow } from '@/components/PostRow';
import { useActivity, useCalendar, useMe, useRecentPosts } from '@/api/resources';
import { firstName, initialOf } from '@/api/me';
import { platformLabel } from '@/api/channels';
import { postSortKey } from '@/api/posts';
import { weekdayIndex } from '@/api/activity';
import { ymd, type CalendarItem } from '@/api/calendar';
import { greeting, todayEyebrow } from '@/api/format';
import { HANDOFF } from '@/theme/handoff';
import { useMarkLanded } from '@/lib/mark-handoff';
import { color, font, layout, radius, shadow, space, text, tone } from '@/theme';

/**
 * Home — the streak as the hero, then the two things you make, what is coming
 * up, and the latest posts.
 *
 * Each band is one endpoint: activity, calendar, posts. Recent notes are not
 * here any more; the Notes tab is one tap away and Home's job is momentum.
 */
export default function Home() {
    const insets = useSafeAreaInsets();

    // The hero is purple edge to edge, so the clock and battery go white while
    // Home is showing — and back to dark for every other screen.
    useFocusEffect(
        useCallback(() => {
            setStatusBarStyle('light');
            return () => setStatusBarStyle('dark');
        }, []),
    );

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: color.cream }}
            contentContainerStyle={{ paddingBottom: space.xxl }}
            showsVerticalScrollIndicator={false}
        >
            {/* Pull-down overscroll shows purple rather than a cream gap above the hero. */}
            <View style={{ position: 'absolute', left: 0, right: 0, top: -800, height: 800, backgroundColor: color.brand }} />
            <Hero top={insets.top + layout.headerTop} />
            <Actions />
            <UpNext />
            <RecentPosts />
        </ScrollView>
    );
}

/* ────────────────────────────── Hero ────────────────────────────── */

const WEEKDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Hero({ top }: { top: number }) {
    const me = useMe();
    const activity = useActivity();
    const landed = useMarkLanded();
    const name = firstName(me.data);

    // The last seven days, ending today. Placeholders while loading keep the
    // row's shape, so nothing jumps when the real days arrive.
    const days = activity.data?.days.slice(-7) ?? [];
    const week = days.length
        ? days.map((d) => ({ key: d.date, label: WEEKDAY[weekdayIndex(d.date)], done: d.count > 0 }))
        : Array.from({ length: 7 }, (_, i) => ({ key: String(i), label: '', done: false }));
    const todayDone = week[week.length - 1]?.done ?? false;
    const streak = activity.data?.streak ?? 0;

    const sticker =
        activity.status === 'error' ? 'Couldn’t load your streak'
            : todayDone ? 'Today counts!'
                : streak > 0 ? 'Jot one today to keep it hot'
                    : 'Start the fire today';

    return (
        <View
            style={{
                backgroundColor: color.brand,
                borderBottomLeftRadius: 36,
                borderBottomRightRadius: 36,
                overflow: 'hidden',
                paddingTop: top,
                paddingBottom: 64,
                gap: 22,
            }}
        >
            {/* Layered shapes for depth — both tints of the brand. */}
            <View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: color.brandHover, right: -110, top: -90 }} />
            <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: tone.violet, left: -60, bottom: -70 }} />

            <View style={{ paddingHorizontal: HANDOFF.home.gutter, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                {/* Where the splash mark lands for a returning user — size and
                    offset come from the shared hand-off geometry. The white disc
                    behind it is what keeps the indigo arm legible on purple. */}
                <View style={{ marginTop: HANDOFF.home.markTop }}>
                    <View
                        style={{
                            position: 'absolute',
                            left: -HANDOFF.home.discPad,
                            top: -HANDOFF.home.discPad,
                            width: HANDOFF.home.markSize + HANDOFF.home.discPad * 2,
                            height: HANDOFF.home.markSize + HANDOFF.home.discPad * 2,
                            borderRadius: radius.pill,
                            backgroundColor: color.white,
                        }}
                    />
                    <View style={{ opacity: landed ? 1 : 0 }}>
                        <SwirlMark size={HANDOFF.home.markSize} />
                    </View>
                </View>
                <View style={{ gap: 5, flex: 1, paddingLeft: 4 }}>
                    <Text style={[text.eyebrow, { color: color.brandWash }]}>{todayEyebrow()}</Text>
                    <Text numberOfLines={1} style={[text.displayLg, { fontSize: 30, lineHeight: 36, color: color.white }]}>
                        {greeting()}
                        {name ? `, ${name}` : ''}
                    </Text>
                </View>
                <KitchenMenu variant="initial" />
            </View>

            {/* The streak. The year grid lives on You; this is the last week. */}
            <Pressable
                onPress={() => router.push('/(tabs)/you')}
                accessibilityRole="button"
                accessibilityLabel={`${streak} day streak. ${sticker}`}
                style={{ paddingHorizontal: space.gutter, gap: 20 }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
                    <Text style={{ fontFamily: font.serif, fontSize: 104, lineHeight: 112, color: color.white, letterSpacing: -2 }}>
                        {activity.data ? streak : '–'}
                    </Text>
                    <View style={{ gap: 8, paddingBottom: 18 }}>
                        <View
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: streak > 0 ? color.accent : color.brandHover,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Icon name="flame" size={24} tint={streak > 0 ? color.ink : tone.orchid} weight={2.4} />
                        </View>
                        <Text style={{ fontFamily: font.extrabold, fontSize: 16, lineHeight: 20, color: color.white }}>
                            day{'\n'}streak
                        </Text>
                    </View>
                    <View
                        style={{
                            marginLeft: 'auto',
                            marginBottom: 26,
                            maxWidth: 104,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: todayDone ? color.successBg : color.ink,
                            transform: [{ rotate: '6deg' }],
                        }}
                    >
                        <Text style={{ fontFamily: font.extrabold, fontSize: 12, lineHeight: 15, color: todayDone ? color.success : color.accent }}>
                            {sticker}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {week.map((d, i) => {
                        const isToday = i === week.length - 1 && days.length > 0;
                        return (
                            <View key={d.key} style={{ alignItems: 'center', gap: 6 }}>
                                <View
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 19,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: d.done ? color.white : isToday ? color.accent : color.brandHover,
                                        borderWidth: isToday && !d.done ? 3 : 0,
                                        borderColor: color.white,
                                    }}
                                >
                                    {d.done ? <Icon name="check" size={16} tint={color.brand} weight={3.4} /> : null}
                                </View>
                                <Text style={{ fontFamily: font.extrabold, fontSize: 10, lineHeight: 12, color: color.brandWash }}>
                                    {d.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </Pressable>
        </View>
    );
}

/* ────────────────────────────── Actions ────────────────────────────── */

/**
 * Two tiles, because there are exactly two things you create: a note, or a
 * post. Scheduling is a status picked at publish time on the same publishPost
 * call — never a separate destination.
 */
function Actions() {
    return (
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: space.gutter, marginTop: -40 }}>
            <ActionTile label="Jot a note" icon="plus" onPress={() => router.push('/capture')} />
            <ActionTile label="New post" icon="send" dark onPress={() => router.push('/compose')} />
        </View>
    );
}

function ActionTile({ label, icon, dark, onPress }: { label: string; icon: IconName; dark?: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
                {
                    flex: 1,
                    height: 104,
                    padding: 14,
                    borderRadius: 24,
                    backgroundColor: dark ? color.ink : color.surface,
                    justifyContent: 'space-between',
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                },
                dark ? shadow.liftDark : shadow.lift,
            ]}
        >
            <View
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: dark ? color.accent : color.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name={icon} size={20} tint={dark ? color.ink : color.white} weight={2.6} />
            </View>
            <Text style={{ fontFamily: font.extrabold, fontSize: 16, lineHeight: 20, color: dark ? color.white : color.ink }}>{label}</Text>
        </Pressable>
    );
}

/* ────────────────────────────── Up next ────────────────────────────── */

const UP_NEXT_DAYS = 14;

type Upcoming = { key: string; date: string; label: string; item: CalendarItem };

/** A heading in the editorial serif, with an optional chip or link beside it. */
function BandHeader({
    title,
    chip,
    action,
    onAction,
    flush,
}: {
    title: string;
    chip?: string;
    action?: string;
    onAction?: () => void;
    /** The band already has both gutters, so no right padding of its own. */
    flush?: boolean;
}) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingRight: flush ? 0 : space.gutter }}>
            <Text style={{ fontFamily: font.serif, fontSize: 24, lineHeight: 28, color: color.ink }}>{title}</Text>
            {chip ? (
                <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: color.brandTint }}>
                    <Text style={[text.badge, { fontSize: 11, color: color.chipSelectedFg }]}>{chip}</Text>
                </View>
            ) : null}
            {action ? (
                <Pressable onPress={onAction} accessibilityRole="link" hitSlop={8} style={{ marginLeft: 'auto', minHeight: 44, justifyContent: 'center' }}>
                    <Text style={text.link}>{action}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

function upcomingLabel(item: CalendarItem): string {
    if (item.kind === 'post') {
        const first = item.platforms[0];
        return first ? `${platformLabel(first)} post` : 'Post';
    }
    return item.text || (item.kind === 'reminder' ? 'Reminder' : 'Idea');
}

function UpNext() {
    // "Now" is pinned when Home mounts, so a re-render cannot move the window
    // or the cut-off under the list.
    const [now] = useState(() => Date.now());
    const from = new Date(now);
    const to = new Date(now);
    to.setDate(to.getDate() + UP_NEXT_DAYS - 1);
    const calendar = useCalendar(ymd(from), ymd(to));

    // Anything still ahead of now. An item earlier today has already happened.
    const upcoming: Upcoming[] = (calendar.data?.days ?? []).flatMap((d) =>
        d.items
            .filter((item) => Date.parse(item.startsAt) >= now)
            .map((item, i) => ({ key: `${d.date}-${i}`, date: d.date, label: upcomingLabel(item), item })),
    );

    return (
        <View style={{ paddingTop: 22, paddingLeft: space.gutter, gap: 10 }}>
            <BandHeader title="Up next" chip={upcoming.length ? `${upcoming.length} coming up` : undefined} />
            {calendar.status === 'error' && !calendar.data ? (
                <View style={{ paddingRight: space.gutter }}>
                    <Failed message="Couldn’t load what’s coming up." onRetry={calendar.refresh} />
                </View>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: space.gutter }}>
                    {calendar.data
                        ? upcoming.slice(0, 6).map((u) => <UpNextBubble key={u.key} upcoming={u} />)
                        : [0, 1, 2].map((i) => <BubbleShell key={i} />)}
                    <PlanBubble onlyOne={!!calendar.data && upcoming.length === 0} />
                </ScrollView>
            )}
        </View>
    );
}

const BUBBLE = 68;

function Bubble({
    ring,
    fill,
    ink,
    dashed,
    top,
    bottom,
    label,
    onPress,
    a11y,
}: {
    ring: string;
    fill: string;
    ink: string;
    dashed?: boolean;
    top: string;
    bottom: string;
    label: string;
    onPress?: () => void;
    a11y: string;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            style={({ pressed }) => ({ width: BUBBLE, alignItems: 'center', gap: 6, transform: [{ scale: pressed ? 0.94 : 1 }] })}
        >
            <View
                style={{
                    width: BUBBLE,
                    height: BUBBLE,
                    borderRadius: BUBBLE / 2,
                    padding: 3,
                    borderWidth: 3,
                    borderStyle: dashed ? 'dashed' : 'solid',
                    borderColor: ring,
                }}
            >
                <View style={{ flex: 1, borderRadius: BUBBLE, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: font.serif, fontSize: 22, lineHeight: 25, color: ink }}>{top}</Text>
                    <Text style={{ fontFamily: font.extrabold, fontSize: 9, lineHeight: 11, letterSpacing: 1, color: ink }}>{bottom}</Text>
                </View>
            </View>
            <Text numberOfLines={1} style={{ width: BUBBLE, textAlign: 'center', fontFamily: font.bold, fontSize: 11, lineHeight: 14, color: color.ink }}>
                {label}
            </Text>
        </Pressable>
    );
}

/** Purple for a post, orange for a reminder, ink for an idea — the same key the calendar dots use. */
function UpNextBubble({ upcoming }: { upcoming: Upcoming }) {
    const { item, date, label } = upcoming;
    const d = new Date(`${date}T00:00:00`);
    const day = d.toLocaleString(undefined, { weekday: 'short' }).toUpperCase();
    const look =
        item.kind === 'post' ? { ring: color.brand, fill: color.brand, ink: color.white }
            : item.kind === 'reminder' ? { ring: color.accent, fill: color.accent, ink: color.ink }
                : { ring: color.ink, fill: color.ink, ink: color.white };
    const onPress =
        item.kind === 'post' ? () => router.push(`/post/${item.postId}`)
            : item.kind === 'reminder' ? () => router.push(`/note/${item.noteId}`)
                : () => router.push('/(tabs)/calendar');

    return (
        <Bubble
            {...look}
            top={String(d.getDate())}
            bottom={day}
            label={label}
            onPress={onPress}
            a11y={`${label}, ${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`}
        />
    );
}

function BubbleShell() {
    return (
        <View style={{ width: BUBBLE, alignItems: 'center', gap: 6 }}>
            <View style={{ width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2, backgroundColor: tone.sand }} />
            <View style={{ width: 44, height: 10, borderRadius: 5, marginTop: 2, backgroundColor: tone.sand }} />
        </View>
    );
}

function PlanBubble({ onlyOne }: { onlyOne: boolean }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Bubble
                ring={tone.orchid}
                fill={color.brandWash}
                ink={color.chipSelectedFg}
                dashed
                top="+"
                bottom="PLAN"
                label="Plan one"
                onPress={() => router.push('/compose')}
                a11y="Plan a post"
            />
            {onlyOne ? (
                <Text style={[text.meta, { color: color.muted, width: 170, paddingBottom: 20 }]}>
                    Nothing planned for the next two weeks. Schedule a post and it lands here.
                </Text>
            ) : null}
        </View>
    );
}

/* ────────────────────────────── Recent posts ────────────────────────────── */

/** Enough for a glance; "See all" is right there for the rest. */
const RECENT = 3;

/** The latest posts, as the same rows the posts screen draws — one look for a post wherever it appears. */
function RecentPosts() {
    const posts = useRecentPosts();
    const recent = [...(posts.data ?? [])].sort((a, b) => postSortKey(b).localeCompare(postSortKey(a))).slice(0, RECENT);

    return (
        <View style={{ paddingTop: 18, paddingHorizontal: space.gutter, gap: 6 }}>
            <BandHeader title="Recent posts" action="See all" onAction={() => router.push('/posts')} flush />
            {posts.status === 'error' && !posts.data ? <Failed message={posts.error} onRetry={posts.refresh} /> : null}
            {!posts.data && posts.status !== 'error' ? <Loading label="Fetching your posts…" /> : null}
            {posts.data && recent.length === 0 ? (
                <Empty icon="send" title="No posts yet" body="Anything you publish or schedule shows up here." />
            ) : null}
            <View style={{ gap: 10 }}>
                {recent.map((p) => (
                    <PostRow key={p.id} post={p} />
                ))}
            </View>
        </View>
    );
}

/** The account initial, for screens that still show it in their header. */
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
