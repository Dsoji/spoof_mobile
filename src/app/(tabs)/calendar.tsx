import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/ui';
import { Failed, Loading } from '@/components/ListState';
import { PostThumb } from '@/components/PostRow';
import { cachedPost, useCalendar } from '@/api/resources';
import { ymd, type CalendarItem } from '@/api/calendar';
import { platformLabel } from '@/api/channels';
import { color, font, radius, shadow, space, text, tone, HIT } from '@/theme';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Dot colour per kind — the same key Home's Up next uses: brand posts, accent reminders, ink ideas. */
const DOT: Record<CalendarItem['kind'], string> = {
    post: color.brand,
    reminder: color.accent,
    idea: color.ink,
};

/** Agenda card faces, one per kind, with the tag colours that read on each. */
const FACE: Record<CalendarItem['kind'], { bg: string; fg: string; tagBg: string; tagFg: string }> = {
    post: { bg: color.brand, fg: color.white, tagBg: color.white, tagFg: color.chipSelectedFg },
    reminder: { bg: color.accent, fg: color.ink, tagBg: color.ink, tagFg: color.white },
    idea: { bg: color.ink, fg: color.white, tagBg: color.accent, tagFg: color.ink },
};

/**
 * The calendar merges three sources: note reminders (`remind_at`), planned
 * ideas (`ideas.planned_at`) and scheduled posts. One endpoint, one range —
 * the visible month.
 *
 * Laid out with nested flex rows rather than a grid — React Native has no CSS
 * grid, so the seven columns are `flex: 1` children of a week row.
 */
export default function Calendar() {
    const now = new Date();
    const todayKey = ymd(now);

    const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
    const [picked, setPicked] = useState<string | null>(null);

    const first = month;
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const from = ymd(first);
    const to = ymd(last);

    const calendar = useCalendar(from, to);

    const byDate = useMemo(() => {
        const map = new Map<string, CalendarItem[]>();
        for (const day of calendar.data?.days ?? []) map.set(day.date, day.items);
        return map;
    }, [calendar.data]);

    // Default selection: today when it is in view, otherwise the 1st.
    const inThisMonth = todayKey >= from && todayKey <= to;
    const selected = picked && picked >= from && picked <= to ? picked : inThisMonth ? todayKey : from;

    // Monday-first: getDay() is Sunday-first, so shift by six.
    const lead = (first.getDay() + 6) % 7;
    const cells: (number | null)[] = [
        ...Array<null>(lead).fill(null),
        ...Array.from({ length: last.getDate() }, (_, i) => i + 1),
    ];
    while (cells.length % 7) cells.push(null);
    const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

    const shift = (delta: number) => {
        setPicked(null);
        setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    };

    const agenda = byDate.get(selected) ?? [];
    const selectedDate = new Date(`${selected}T12:00:00`);

    const dayTitle =
        selected === todayKey
            ? 'Today'
            : `${selectedDate.toLocaleString(undefined, { weekday: 'long' })} ${selectedDate.getDate()}`;

    return (
        <Screen scroll>
            <View style={{ paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ gap: 4 }}>
                    <Text style={text.eyebrow}>{String(month.getFullYear())}</Text>
                    <Text style={[text.displayXl, { lineHeight: 51 }]}>{month.toLocaleString(undefined, { month: 'long' })}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                    <RoundButton icon="chevronLeft" label="Previous month" onPress={() => shift(-1)} />
                    <RoundButton icon="chevronRight" label="Next month" dark onPress={() => shift(1)} />
                </View>
            </View>

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 14 }}>
                <View style={[{ backgroundColor: color.surface, borderRadius: 26, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 }, shadow.lift]}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                        {DOW.map((d, i) => (
                            <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: font.extrabold, fontSize: 10.5, color: color.muted }}>
                                {d}
                            </Text>
                        ))}
                    </View>

                    {weeks.map((week, wi) => (
                        <View key={wi} style={{ flexDirection: 'row' }}>
                            {week.map((day, di) => {
                                if (day === null) return <View key={di} style={{ flex: 1, height: 50 }} />;
                                const key = ymd(new Date(month.getFullYear(), month.getMonth(), day));
                                const isToday = key === todayKey;
                                const isSelected = key === selected;
                                const past = key < todayKey;
                                const weekend = di >= 5;
                                const items = byDate.get(key) ?? [];
                                // One dot per kind present, at most three — the agenda below has the full list.
                                const kinds = [...new Set(items.map((i) => i.kind))];
                                const fill = isToday ? color.brand : isSelected ? color.ink : 'transparent';
                                const ink = isToday || isSelected ? color.white : past ? color.inactiveFg : weekend ? color.muted : color.ink;
                                return (
                                    <Pressable
                                        key={di}
                                        onPress={() => setPicked(key)}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isSelected }}
                                        accessibilityLabel={`${day}${items.length ? `, ${items.length} planned` : ''}`}
                                        style={{ flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', gap: 3 }}
                                    >
                                        <View
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 18,
                                                backgroundColor: fill,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                // Today, selected: purple with an ink ring, so both facts show.
                                                borderWidth: isToday && isSelected ? 2 : 0,
                                                borderColor: color.ink,
                                            }}
                                        >
                                            <Text style={{ fontFamily: font.extrabold, fontSize: 14.5, color: ink }}>{day}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
                                            {kinds.map((kind) => (
                                                <View key={kind} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: DOT[kind] }} />
                                            ))}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </View>

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 10, flexDirection: 'row', gap: 14 }}>
                <Legend tint={DOT.post} label="Posts" />
                <Legend tint={DOT.reminder} label="Reminders" />
                <Legend tint={DOT.idea} label="Ideas" />
            </View>

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 18, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: font.serif, fontSize: 24, lineHeight: 28, color: color.ink }}>{dayTitle}</Text>
                    {agenda.length ? (
                        <View style={{ height: 24, paddingHorizontal: 9, borderRadius: radius.pill, backgroundColor: color.brandTint, justifyContent: 'center' }}>
                            <Text style={[text.badge, { fontSize: 11.5, color: color.chipSelectedFg }]}>{`${agenda.length} planned`}</Text>
                        </View>
                    ) : null}
                </View>

                {calendar.status === 'loading' ? <Loading label="Fetching your month…" /> : null}
                {calendar.status === 'error' && !calendar.data ? <Failed message={calendar.error} onRetry={calendar.refresh} /> : null}

                {/* Said plainly rather than left out: a day that looks empty
                    because Zernio blinked would read as "nothing scheduled". */}
                {calendar.data?.unavailable.includes('posts') ? (
                    <Text style={[text.meta, { fontFamily: font.semibold, color: color.muted }]}>
                        Scheduled posts couldn’t be loaded — only reminders and ideas are showing.
                    </Text>
                ) : null}

                {calendar.status === 'ready' && agenda.length === 0 ? (
                    <View
                        style={{
                            borderWidth: 2,
                            borderStyle: 'dashed',
                            borderColor: tone.orchid,
                            backgroundColor: color.brandWash,
                            borderRadius: 22,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <View style={{ flex: 1, gap: 3 }}>
                            <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>Nothing on the stove</Text>
                            <Text style={[text.meta, { color: color.muted }]}>Schedule a post or set a reminder and it lands here.</Text>
                        </View>
                        <Pressable
                            onPress={() => router.push('/compose')}
                            accessibilityRole="button"
                            style={{ height: HIT, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.brand, justifyContent: 'center' }}
                        >
                            <Text style={{ fontFamily: font.extrabold, fontSize: 13.5, color: color.white }}>Plan one</Text>
                        </Pressable>
                    </View>
                ) : null}

                {agenda.map((item, i) => (
                    <AgendaRow key={`${item.kind}-${i}`} item={item} />
                ))}
            </View>
        </Screen>
    );
}

function RoundButton({ icon, label, dark, onPress }: { icon: IconName; label: string; dark?: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({
                width: HIT,
                height: HIT,
                borderRadius: HIT / 2,
                backgroundColor: dark ? color.ink : tone.sand,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.92 : 1 }],
            })}
        >
            <Icon name={icon} size={18} tint={dark ? color.white : color.ink} weight={2.6} />
        </Pressable>
    );
}

/** A time on a rail, and a colour card for the item. */
function AgendaRow({ item }: { item: CalendarItem }) {
    const face = FACE[item.kind];
    // A scheduled post only carries its text here; if a list already loaded
    // the post, borrow its media for a thumbnail rather than fetch it again.
    const post = item.kind === 'post' ? cachedPost(item.postId) : undefined;
    const tag =
        item.kind === 'post' ? item.platforms.map(platformLabel).join(' · ') || 'Post'
            : item.kind === 'reminder' ? 'Reminder'
                : 'Idea';

    return (
        <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 48, alignItems: 'center', gap: 6, paddingTop: 14 }}>
                <Text style={{ fontFamily: font.extrabold, fontSize: 12, color: color.ink }}>{item.at}</Text>
                <View style={{ width: 2, flex: 1, borderRadius: 1, backgroundColor: color.hairline }} />
            </View>
            <Pressable
                style={({ pressed }) => ({
                    flex: 1,
                    borderRadius: 20,
                    padding: 12,
                    backgroundColor: face.bg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
                disabled={item.kind === 'idea'}
                accessibilityRole={item.kind === 'idea' ? 'text' : 'button'}
                onPress={() => {
                    if (item.kind === 'reminder') router.push(`/note/${item.noteId}`);
                    else if (item.kind === 'post') router.push(`/post/${item.postId}`);
                }}
            >
                {post?.media.length ? <PostThumb post={post} size={56} rounded={14} /> : null}
                <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: face.tagBg, justifyContent: 'center' }}>
                        <Text numberOfLines={1} style={[text.badge, { color: face.tagFg }]}>{tag}</Text>
                    </View>
                    <Text numberOfLines={3} style={{ fontFamily: font.serif, fontSize: 18, lineHeight: 22, color: face.fg }}>
                        {item.text || (item.kind === 'post' ? 'Untitled post' : 'Empty note')}
                    </Text>
                </View>
            </Pressable>
        </View>
    );
}

function Legend({ tint, label }: { tint: string; label: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint }} />
            <Text style={{ fontFamily: font.bold, fontSize: 11.5, color: color.muted }}>{label}</Text>
        </View>
    );
}
