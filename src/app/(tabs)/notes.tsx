import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { Avatar } from './index';
import { Icon } from '@/components/Icon';
import { Gutter, Screen } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { useNotes, type Note } from '@/api/useNotes';
import { todayEyebrow } from '@/api/format';
import { color, font, radius, shadow, space, text, tone, HIT } from '@/theme';

const FILTERS = ['All', 'Reminders', 'Used'] as const;
type Filter = (typeof FILTERS)[number];

/** The capture inbox, as a two-column board of colour-blocked cards. */
export default function Notes() {
    const [filter, setFilter] = useState<Filter>('All');
    const [refreshing, setRefreshing] = useState(false);
    const { notes, status, error, refresh } = useNotes();

    const reminders = useMemo(() => notes.filter((n) => n.remindAt !== null), [notes]);
    const visible = useMemo(() => {
        if (filter === 'Reminders') return reminders;
        // 'Used' means "already turned into a post", which nothing records yet —
        // there is no link from a note to the post it became. Rather than
        // filter on a field that is always undefined and show a permanently
        // empty tab, this falls through to everything until that link exists.
        return notes;
    }, [notes, reminders, filter]);

    // Masonry without a grid: two flex columns, filled alternately. Cards keep
    // their reading order left-right, top-down.
    const columns = [visible.filter((_, i) => i % 2 === 0), visible.filter((_, i) => i % 2 === 1)];

    const onRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <Screen
                scroll
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.muted} />}
            >
                <Gutter style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                    <View style={{ gap: 4, flex: 1 }}>
                        <Text style={text.eyebrow}>{todayEyebrow()}</Text>
                        <Text style={[text.displayXl, { lineHeight: 51 }]}>Notes</Text>
                        {status === 'ready' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Icon name="flame" size={14} tint={color.accent} weight={2.4} />
                                <Text style={[text.meta, { fontFamily: font.bold, fontSize: 13, color: color.muted }]}>
                                    {notes.length === 1 ? '1 idea simmering' : `${notes.length} ideas simmering`}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <Avatar />
                </Gutter>

                <Gutter style={{ paddingTop: 16, flexDirection: 'row', gap: 8 }}>
                    {FILTERS.map((f) => (
                        <FilterChip
                            key={f}
                            label={f}
                            on={f === filter}
                            // 'Used' has no count: it shows everything until notes know their posts.
                            count={status !== 'ready' || f === 'Used' ? undefined : f === 'Reminders' ? reminders.length : notes.length}
                            onPress={() => setFilter(f)}
                        />
                    ))}
                </Gutter>

                <Gutter style={{ paddingTop: 18 }}>
                    {status === 'loading' ? <Loading label="Fetching your notes…" /> : null}
                    {status === 'error' ? <Failed message={error} onRetry={refresh} /> : null}
                    {status === 'ready' && visible.length === 0 ? (
                        <Empty
                            icon="plus"
                            title={filter === 'Reminders' ? 'No reminders yet' : 'Nothing jotted yet'}
                            body={
                                filter === 'Reminders'
                                    ? 'Notes you set a nudge on will show up here.'
                                    : 'Tap Jot the next time an idea turns up.'
                            }
                        />
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                        {columns.map((col, c) => (
                            <View key={c} style={{ flex: 1, gap: 12 }}>
                                {col.map((n, i) => (
                                    <NoteCard key={n.id} note={n} index={i * 2 + c} />
                                ))}
                            </View>
                        ))}
                    </View>
                    {/* Room for the last row to scroll clear of the Jot button. */}
                    <View style={{ height: 76 }} />
                </Gutter>
            </Screen>

            {/* Capture is the app's main verb, so it gets a permanent target. */}
            <Pressable
                onPress={() => router.push('/capture')}
                accessibilityRole="button"
                accessibilityLabel="Jot a note"
                style={({ pressed }) => [
                    {
                        position: 'absolute',
                        right: space.gutter,
                        bottom: space.lg,
                        height: 60,
                        paddingLeft: 18,
                        paddingRight: 22,
                        borderRadius: radius.pill,
                        backgroundColor: color.brand,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                    shadow.fab,
                ]}
            >
                <Icon name="plus" size={22} tint={color.white} weight={2.6} />
                <Text style={[text.ctaSm, { color: color.white }]}>Jot</Text>
            </Pressable>
        </View>
    );
}

function FilterChip({ label, on, count, onPress }: { label: string; on: boolean; count?: number; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
                height: HIT,
                paddingLeft: 16,
                paddingRight: count === undefined ? 16 : 8,
                borderRadius: radius.pill,
                backgroundColor: on ? color.ink : color.surface,
                borderWidth: on ? 0 : 1.5,
                borderColor: color.fieldBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
            }}
        >
            <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: on ? color.white : color.ink }}>{label}</Text>
            {count !== undefined ? (
                <View
                    style={{
                        minWidth: 26,
                        height: 26,
                        paddingHorizontal: 6,
                        borderRadius: radius.pill,
                        backgroundColor: on ? color.accent : tone.sand,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{ fontFamily: font.extrabold, fontSize: 12, color: on ? color.ink : color.muted }}>{count}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

/**
 * Card faces. A reminder is always orange, so a nudge is findable at a glance;
 * everything else cycles through the rest. Each face carries the tag, meta and
 * button colours that read on it.
 */
const FACES = {
    brand: { bg: color.brand, fg: color.white, sub: color.brandWash, tagBg: color.white, tagFg: color.chipSelectedFg, goBg: color.white, goFg: color.brand, tilt: '-1.5deg' },
    surface: { bg: color.surface, fg: color.ink, sub: color.muted, tagBg: color.brandTint, tagFg: color.chipSelectedFg, goBg: color.brand, goFg: color.white, tilt: '0deg' },
    ink: { bg: color.ink, fg: color.white, sub: color.inactive, tagBg: color.accent, tagFg: color.ink, goBg: color.brand, goFg: color.white, tilt: '1deg' },
    lilac: { bg: tone.lilac, fg: color.ink, sub: color.chipSelectedFg, tagBg: color.white, tagFg: color.chipSelectedFg, goBg: color.white, goFg: color.brand, tilt: '-1deg' },
    accent: { bg: color.accent, fg: color.ink, sub: color.ink, tagBg: color.ink, tagFg: color.white, goBg: color.ink, goFg: color.white, tilt: '1.5deg' },
} as const;

const CYCLE = ['brand', 'surface', 'ink', 'surface', 'lilac', 'surface'] as const;

/** Short notes set in the serif, big — they read like headlines. Long ones stay in the body face. */
const HEADLINE_MAX = 70;

function NoteCard({ note, index }: { note: Note; index: number }) {
    const face = FACES[note.remindAt ? 'accent' : CYCLE[index % CYCLE.length]];
    const body = note.text.trim();
    const headline = body.length > 0 && body.length <= HEADLINE_MAX;

    return (
        <Pressable
            onPress={() => router.push(`/note/${note.id}`)}
            accessibilityRole="button"
            accessibilityLabel={body || 'Empty note'}
            style={({ pressed }) => [
                {
                    padding: 14,
                    borderRadius: 22,
                    backgroundColor: face.bg,
                    gap: 12,
                    transform: [{ rotate: face.tilt }, { scale: pressed ? 0.97 : 1 }],
                },
                face === FACES.surface && shadow.lift,
            ]}
        >
            <View
                style={{
                    alignSelf: 'flex-start',
                    height: 24,
                    paddingHorizontal: 9,
                    borderRadius: radius.pill,
                    backgroundColor: face.tagBg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                }}
            >
                {note.remindLabel ? <Icon name="clock" size={12} tint={face.tagFg} weight={2.4} /> : null}
                <Text style={[text.badge, { color: face.tagFg }]}>{note.remindLabel ?? 'Idea'}</Text>
            </View>

            {body ? (
                <Text
                    numberOfLines={headline ? 4 : 7}
                    style={
                        headline
                            ? { fontFamily: font.serif, fontSize: 21, lineHeight: 25, color: face.fg }
                            : { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: face.fg }
                    }
                >
                    {body}
                </Text>
            ) : (
                // A note saved with no words — from the web board, usually. Say
                // so rather than draw a blank card that looks broken.
                <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: face.sub }}>Empty note</Text>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: font.bold, fontSize: 11.5, color: face.sub }}>{note.createdLabel}</Text>
                {body ? (
                    <Pressable
                        onPress={() =>
                            router.push({
                                pathname: '/compose',
                                params: { text: body, noteId: note.id, noteCreatedAt: note.createdAt },
                            })
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Turn into a post"
                        hitSlop={4}
                        style={({ pressed }) => ({
                            width: HIT,
                            height: HIT,
                            borderRadius: HIT / 2,
                            backgroundColor: face.goBg,
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: [{ scale: pressed ? 0.9 : 1 }],
                        })}
                    >
                        <Icon name="arrowRight" size={16} tint={face.goFg} weight={2.6} />
                    </Pressable>
                ) : (
                    <View style={{ height: HIT }} />
                )}
            </View>
        </Pressable>
    );
}
