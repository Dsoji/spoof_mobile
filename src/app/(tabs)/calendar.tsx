import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Badge, Card, Gutter, IconButton, Screen } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { useCalendar } from '@/api/resources';
import { ymd, type CalendarItem } from '@/api/calendar';
import { platformLabel } from '@/api/channels';
import { color, font, radius, text } from '@/theme';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Dot colour per kind. Posts are brand, reminders accent; ideas take the quiet neutral. */
const DOT: Record<CalendarItem['kind'], string> = {
    post: color.brand,
    reminder: color.accent,
    idea: color.subtle,
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

    return (
        <Screen scroll>
            <Gutter style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ gap: 6 }}>
                    <Text style={text.eyebrow}>{String(month.getFullYear())}</Text>
                    <Text style={text.displayLg}>{month.toLocaleString(undefined, { month: 'long' })}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    <IconButton name="chevronLeft" onPress={() => shift(-1)} />
                    <IconButton name="chevronRight" onPress={() => shift(1)} />
                </View>
            </Gutter>

            <Gutter style={{ paddingTop: 22 }}>
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                    {DOW.map((d, i) => (
                        <Text
                            key={i}
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                fontFamily: font.extrabold,
                                fontSize: 10,
                                letterSpacing: 1,
                                color: color.subtle,
                            }}
                        >
                            {d}
                        </Text>
                    ))}
                </View>

                {weeks.map((week, wi) => (
                    <View key={wi} style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
                        {week.map((day, di) => {
                            if (day === null) return <View key={di} style={{ flex: 1, height: 46 }} />;
                            const key = ymd(new Date(month.getFullYear(), month.getMonth(), day));
                            const isToday = key === todayKey;
                            const isSelected = key === selected;
                            const weekend = di >= 5;
                            // At most three dots — past that a cell is unreadable,
                            // and the agenda below has the full list.
                            const kinds = (byDate.get(key) ?? []).slice(0, 3).map((i) => i.kind);
                            return (
                                <Pressable
                                    key={di}
                                    onPress={() => setPicked(key)}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: isSelected }}
                                    accessibilityLabel={`${day}${kinds.length ? `, ${byDate.get(key)?.length} planned` : ''}`}
                                    style={{
                                        flex: 1,
                                        height: 46,
                                        borderRadius: radius.field,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4,
                                        backgroundColor: isSelected ? color.brand : isToday ? color.surface : 'transparent',
                                        borderWidth: isToday && !isSelected ? 1 : 0,
                                        borderColor: color.hairline,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontFamily: font.bold,
                                            fontSize: 14,
                                            color: isSelected ? color.surface : weekend ? color.inactiveFg : color.ink,
                                        }}
                                    >
                                        {day}
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 3, height: 5, alignItems: 'center' }}>
                                        {kinds.map((kind, i) => (
                                            <View
                                                key={i}
                                                style={{
                                                    width: 5,
                                                    height: 5,
                                                    borderRadius: 2.5,
                                                    backgroundColor: isSelected ? color.surface : DOT[kind],
                                                }}
                                            />
                                        ))}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </Gutter>

            <Gutter style={{ paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={text.eyebrow}>
                    {`${selectedDate.toLocaleString(undefined, { weekday: 'long' })}, ${selectedDate.getDate()} ${selectedDate.toLocaleString(undefined, { month: 'long' })}`}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Legend tint={DOT.post} label="Posts" />
                    <Legend tint={DOT.reminder} label="Reminders" />
                    <Legend tint={DOT.idea} label="Ideas" />
                </View>
            </Gutter>

            <Gutter style={{ paddingTop: 12, gap: 9 }}>
                {calendar.status === 'loading' ? <Loading label="Fetching your month…" /> : null}
                {calendar.status === 'error' && !calendar.data ? (
                    <Failed message={calendar.error} onRetry={calendar.refresh} />
                ) : null}

                {/* Said plainly rather than left out: a day that looks empty
                    because Zernio blinked would read as "nothing scheduled". */}
                {calendar.data?.unavailable.includes('posts') ? (
                    <Text style={[text.meta, { fontFamily: font.semibold }]}>
                        Scheduled posts couldn’t be loaded — only reminders and ideas are showing.
                    </Text>
                ) : null}

                {calendar.status === 'ready' && agenda.length === 0 ? (
                    <Empty icon="calendar" title="Nothing planned" body="Reminders, planned ideas and scheduled posts land here." />
                ) : null}

                {agenda.map((item, i) => (
                    <View key={`${item.kind}-${i}`} style={{ flexDirection: 'row', gap: 12 }}>
                        <Text
                            style={{
                                width: 54,
                                paddingTop: 15,
                                fontFamily: font.extrabold,
                                fontSize: 12,
                                color: color.muted,
                            }}
                        >
                            {item.at}
                        </Text>
                        <Pressable
                            style={{ flex: 1 }}
                            disabled={item.kind !== 'reminder'}
                            onPress={() => item.kind === 'reminder' && router.push(`/note/${item.noteId}`)}
                        >
                            <Card padded={14}>
                                {item.kind === 'post' ? (
                                    <View style={{ gap: 9 }}>
                                        <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: color.ink }}>
                                            {item.text || 'Untitled post'}
                                        </Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                                            {item.platforms.map((p) => (
                                                <Badge key={p}>{platformLabel(p)}</Badge>
                                            ))}
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                                        <Icon
                                            name={item.kind === 'reminder' ? 'clock' : 'sparkle'}
                                            size={16}
                                            tint={DOT[item.kind]}
                                            weight={2.2}
                                        />
                                        <Text
                                            style={{
                                                flex: 1,
                                                fontFamily: font.semibold,
                                                fontSize: 14,
                                                lineHeight: 20,
                                                color: color.ink,
                                            }}
                                        >
                                            {item.text}
                                        </Text>
                                    </View>
                                )}
                            </Card>
                        </Pressable>
                    </View>
                ))}
            </Gutter>
        </Screen>
    );
}

function Legend({ tint, label }: { tint: string; label: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: tint }} />
            <Text style={{ fontFamily: font.bold, fontSize: 10, color: color.subtle }}>{label}</Text>
        </View>
    );
}
