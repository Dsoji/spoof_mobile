import { Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Badge, Card, Gutter, IconButton, Screen } from '@/components/ui';
import { CALENDAR } from '@/data/mock';
import { color, font, radius, space, text } from '@/theme';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/** September 2026 starts on a Tuesday, so the Monday column leads with a blank. */
const LEAD_BLANKS = 1;
const DAYS = 30;

/**
 * The calendar merges three sources: note reminders (`remind_at`), planned
 * ideas (`ideas.planned_at`) and scheduled posts. One endpoint, one range.
 *
 * Laid out with nested flex rows rather than a grid — React Native has no CSS
 * grid, so the seven columns are `flex: 1` children of a week row.
 */
export default function Calendar() {
    const cells: (number | null)[] = [
        ...Array<null>(LEAD_BLANKS).fill(null),
        ...Array.from({ length: DAYS }, (_, i) => i + 1),
    ];
    while (cells.length % 7) cells.push(null);
    const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

    return (
        <Screen scroll>
            <Gutter style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ gap: 6 }}>
                    <Text style={text.eyebrow}>{CALENDAR.year}</Text>
                    <Text style={text.displayLg}>{CALENDAR.monthLabel}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    <IconButton name="chevronLeft" />
                    <IconButton name="chevronRight" />
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
                            const today = day === CALENDAR.today;
                            const selected = day === CALENDAR.selected;
                            const weekend = di >= 5;
                            return (
                                <View
                                    key={di}
                                    style={{
                                        flex: 1,
                                        height: 46,
                                        borderRadius: radius.field,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4,
                                        backgroundColor: selected ? color.brand : today ? color.surface : 'transparent',
                                        borderWidth: today && !selected ? 1 : 0,
                                        borderColor: color.hairline,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontFamily: font.bold,
                                            fontSize: 14,
                                            color: selected ? color.surface : weekend ? color.inactiveFg : color.ink,
                                        }}
                                    >
                                        {day}
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 3, height: 5, alignItems: 'center' }}>
                                        {(CALENDAR.marks[day] ?? []).map((m, i) => (
                                            <View
                                                key={i}
                                                style={{
                                                    width: 5,
                                                    height: 5,
                                                    borderRadius: 2.5,
                                                    backgroundColor: selected
                                                        ? color.surface
                                                        : m === 'post'
                                                          ? color.brand
                                                          : color.accent,
                                                }}
                                            />
                                        ))}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </Gutter>

            <Gutter style={{ paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={text.eyebrow}>Friday, 11 September</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Legend tint={color.brand} label="Posts" />
                    <Legend tint={color.accent} label="Reminders" />
                </View>
            </Gutter>

            <Gutter style={{ paddingTop: 12, gap: 9 }}>
                {CALENDAR.agenda.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                        <Text
                            style={{
                                width: 54,
                                paddingTop: 15,
                                fontFamily: font.extrabold,
                                fontSize: 12,
                                color: color.muted,
                            }}
                        >
                            {item.time}
                        </Text>
                        <View style={{ flex: 1 }}>
                            <Card padded={14}>
                                {item.kind === 'post' ? (
                                    <View style={{ gap: 9 }}>
                                        <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: color.ink }}>
                                            {item.text}
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 7 }}>
                                            {item.platforms?.map((p) => <Badge key={p}>{p}</Badge>)}
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                                        <Icon name="clock" size={16} tint={color.accent} weight={2.2} />
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
                        </View>
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
