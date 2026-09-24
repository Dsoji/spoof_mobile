import { useCallback, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { KitchenMenu } from '@/components/KitchenMenu';
import { Failed } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { clearToken } from '@/api/session';
import { resetNotes } from '@/api/useNotes';
import { useActivity, useMe } from '@/api/resources';
import { firstName, initialOf, type Me } from '@/api/me';
import { weekdayIndex, type ActivityDay } from '@/api/activity';
import { reminderLabel } from '@/api/format';
import { color, font, graphRamp, HIT, layout, radius, shadow, space, text, tone } from '@/theme';

/** Columns in the graph. A year does not fit a phone; eighteen weeks does. */
const WEEKS = 18;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Sign out.
 *
 * Drops the bearer token, then sends the user back to the first-launch screen
 * with `replace` so the tabs are gone from the history stack and a back gesture
 * cannot walk into a signed-out session. Every shared store clears itself when
 * the token goes, so nothing of this account survives into the next one's.
 *
 * The session row itself still lives on the studio until it expires — revoking
 * it needs an endpoint that does not exist yet. Until then this is a local
 * sign-out.
 */
async function signOut() {
    try {
        await clearToken();
    } catch (e: unknown) {
        toast(e instanceof Error ? e.message : 'Could not sign out.');
        return;
    }
    resetNotes();
    router.replace('/welcome');
}

function confirmSignOut(email: string | undefined) {
    Alert.alert('Log out?', email ? `You'll need a new code to get back into ${email}.` : 'You’ll need a new code to get back in.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
}

/**
 * Weeks of days, Monday first, the last column ending on today.
 *
 * Days after today in the final week are null rather than zero: an empty square
 * says "nothing happened", and nothing has had the chance to yet.
 */
function graphColumns(days: ActivityDay[]): (ActivityDay | null)[][] {
    if (days.length === 0) return Array.from({ length: WEEKS }, () => Array<null>(7).fill(null));
    const todayIndex = weekdayIndex(days[days.length - 1].date);
    const taken = days.slice(-((WEEKS - 1) * 7 + todayIndex + 1));
    const cells: (ActivityDay | null)[] = [
        ...Array<null>(WEEKS * 7 - taken.length - (6 - todayIndex)).fill(null),
        ...taken,
        ...Array<null>(6 - todayIndex).fill(null),
    ];
    return Array.from({ length: WEEKS }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** A month label over the first column of each month, blank elsewhere. */
function monthLabels(columns: (ActivityDay | null)[][]): string[] {
    let previous = '';
    // A label is wider than a column, so one landing within three columns of
    // the last would print over it ("MayJun"). The later month wins the next
    // free slot instead — the earlier one is the partial month at the edge.
    let lastAt = -Infinity;
    const labels = columns.map((week) => {
        const first = week.find((d): d is ActivityDay => d !== null);
        if (!first) return '';
        const month = new Date(`${first.date}T00:00:00Z`).toLocaleString(undefined, { month: 'short', timeZone: 'UTC' });
        if (month === previous) return '';
        previous = month;
        return month;
    });
    return labels.map((m, i) => {
        if (!m) return '';
        const next = labels.findIndex((n, j) => j > i && n);
        // Drop a label whose neighbour follows too closely; keep the neighbour.
        if (next !== -1 && next - i < 3) return '';
        if (i - lastAt < 3) return '';
        lastAt = i;
        return m;
    });
}

/**
 * The weekday with the most weighted activity, or null when there is too little
 * to say anything. Computed from real days — the insight this card used to show
 * was a fixture.
 */
function busiestWeekday(days: ActivityDay[]): string | null {
    const totals = Array<number>(7).fill(0);
    for (const d of days) totals[weekdayIndex(d.date)] += d.score;
    const max = Math.max(...totals);
    if (max <= 0) return null;
    return WEEKDAYS[totals.indexOf(max)];
}

function planLine(me: Me): string {
    const { plan } = me;
    if (plan.effective === 'locked') return `${plan.name} · choose a plan to keep going`;
    if (plan.status === 'trialing' && plan.trialHoursRemaining !== null) {
        const hours = plan.trialHoursRemaining;
        return hours > 48 ? `Trial · ${Math.ceil(hours / 24)} days left` : `Trial · ${hours} hours left`;
    }
    if (plan.currentPeriodEnd) return `${plan.name} · renews ${reminderLabel(plan.currentPeriodEnd)?.split(',')[0] ?? ''}`.trim();
    return plan.name;
}

export default function You() {
    const insets = useSafeAreaInsets();
    const me = useMe();
    const activity = useActivity();

    // The hero is ink edge to edge, so the status bar goes light while You is showing.
    useFocusEffect(
        useCallback(() => {
            setStatusBarStyle('light');
            return () => setStatusBarStyle('dark');
        }, []),
    );

    const days = activity.data?.days ?? [];
    const columns = graphColumns(days);
    const months = monthLabels(columns);
    const busiest = busiestWeekday(days);
    const stats = activity.data?.stats;
    const channelCount = me.data?.channels.used;
    const streak = activity.data?.streak ?? 0;
    const locked = me.data?.plan.effective === 'locked';

    return (
        <ScrollView style={{ flex: 1, backgroundColor: color.cream }} contentContainerStyle={{ paddingBottom: space.xxl }} showsVerticalScrollIndicator={false}>
            {/* Overscroll above the hero stays ink rather than showing a cream gap. */}
            <View style={{ position: 'absolute', left: 0, right: 0, top: -800, height: 800, backgroundColor: color.ink }} />

            <View
                style={{
                    backgroundColor: color.ink,
                    borderBottomLeftRadius: 36,
                    borderBottomRightRadius: 36,
                    overflow: 'hidden',
                    paddingTop: insets.top + layout.headerTop,
                    paddingBottom: 78,
                    paddingHorizontal: space.gutter,
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: color.chipFg, left: -120, top: -80 }} />
                <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: color.brand, right: -50, bottom: -40 }} />

                {/* Two rings — ink, then white — lift the avatar off the hero. */}
                <View style={{ width: 98, height: 98, borderRadius: 49, backgroundColor: color.white, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontFamily: font.serif, fontSize: 42, lineHeight: 48, color: color.ink }}>{initialOf(me.data)}</Text>
                        </View>
                    </View>
                </View>
                <Text numberOfLines={1} style={{ fontFamily: font.serif, fontSize: 34, lineHeight: 39, color: color.white }}>
                    {me.data ? (me.data.user.name ?? firstName(me.data)) : ' '}
                </Text>

                {/* The kitchen name is where people look to change kitchens, so it is the switcher. */}
                <KitchenMenu channelCount={channelCount} />
            </View>

            {me.status === 'error' && !me.data ? (
                <View style={{ paddingHorizontal: space.gutter }}>
                    <Failed message={me.error} onRetry={me.refresh} />
                </View>
            ) : null}

            <View style={{ paddingHorizontal: space.gutter, marginTop: -52 }}>
                <View style={[{ backgroundColor: color.surface, borderRadius: 26, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }, shadow.lift]}>
                    <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: streak > 0 ? color.accent : tone.sand, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="flame" size={28} tint={streak > 0 ? color.ink : color.inactiveFg} weight={2.4} />
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontFamily: font.serif, fontSize: 52, lineHeight: 60, color: color.ink }}>{activity.data ? streak : '–'}</Text>
                        <Text style={{ fontFamily: font.extrabold, fontSize: 14, lineHeight: 18, color: color.ink }}>
                            {streak === 1 ? 'day' : 'days'}
                            {'\n'}streak
                        </Text>
                    </View>
                    {activity.data ? (
                        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: color.brandTint, alignItems: 'center' }}>
                            {/* Only when it is true: the current run is the longest in the window. */}
                            <Text style={[text.badge, { fontSize: 10, letterSpacing: 1.2, color: color.chipSelectedFg }]}>
                                {streak > 0 && streak === activity.data.best ? 'BEST YET' : 'BEST'}
                            </Text>
                            <Text style={{ fontFamily: font.serif, fontSize: 26, lineHeight: 30, color: color.chipSelectedFg }}>{activity.data.best}</Text>
                        </View>
                    ) : null}
                </View>
            </View>

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 16 }}>
                <View style={[{ backgroundColor: color.surface, borderRadius: 26, padding: 16, gap: 12 }, shadow.card]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: font.serif, fontSize: 22, lineHeight: 26, color: color.ink }}>What you’ve cooked</Text>
                        <Text style={[text.meta, { fontFamily: font.bold, color: color.muted }]}>{`Last ${WEEKS} weeks`}</Text>
                    </View>

                    {/* One column per week; RN has no grid, so weeks are flex columns. */}
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                        {columns.map((week, c) => (
                            <View key={c} style={{ flex: 1, gap: 3 }}>
                                {week.map((day, r) => (
                                    <View key={r} style={{ aspectRatio: 1, borderRadius: 3, backgroundColor: day ? graphRamp[day.level] : 'transparent' }} />
                                ))}
                            </View>
                        ))}
                    </View>

                    {/* A label sits over the first column of its month and runs into the next few;
                        a column is narrower than "Aug", so each label floats instead of truncating. */}
                    <View style={{ flexDirection: 'row', gap: 3, height: 13 }}>
                        {months.map((m, i) => (
                            <View key={i} style={{ flex: 1 }}>
                                {m ? (
                                    <Text style={{ position: 'absolute', left: 0, width: 40, fontFamily: font.bold, fontSize: 10, lineHeight: 13, color: color.muted }}>
                                        {m}
                                    </Text>
                                ) : null}
                            </View>
                        ))}
                    </View>

                    {activity.status === 'error' && !activity.data ? (
                        <Failed message={activity.error} onRetry={activity.refresh} />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <Text style={[text.meta, { fontFamily: font.bold, fontSize: 10, color: color.muted, marginRight: 3 }]}>Less</Text>
                            {graphRamp.map((c) => (
                                <View key={c} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: c }} />
                            ))}
                            <Text style={[text.meta, { fontFamily: font.bold, fontSize: 10, color: color.muted, marginLeft: 3 }]}>More</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 12, flexDirection: 'row', gap: 10 }}>
                <StatTile value={stats ? String(stats.notesJotted) : '–'} label={'notes\njotted'} bg={color.brand} fg={color.white} tilt="-1.5deg" />
                <StatTile value={stats ? String(stats.postsPublished) : '–'} label={'posts\npublished'} bg={color.accent} fg={color.ink} tilt="1deg" />
                <StatTile
                    // Nothing records which post a note became, so this is
                    // unknown rather than zero — a dash, not a made-up number.
                    value={stats?.notesShippedRatio == null ? '–' : `${Math.round(stats.notesShippedRatio * 100)}%`}
                    label={'notes that\nshipped'}
                    bg={tone.orchid}
                    fg={color.ink}
                    tilt="-1deg"
                />
            </View>

            {busiest ? (
                <View style={{ paddingTop: 18, alignItems: 'center' }}>
                    <View
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderRadius: 16,
                            backgroundColor: color.ink,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            transform: [{ rotate: '-2deg' }],
                        }}
                    >
                        <Icon name="sparkle" size={18} tint={color.accent} weight={2.4} />
                        <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.white }}>{`${busiest}s are when you cook the most`}</Text>
                    </View>
                </View>
            ) : null}

            <View style={{ paddingHorizontal: space.gutter, paddingTop: 20, gap: 10 }}>
                <SettingRow
                    icon="lock"
                    iconBg={color.accent}
                    iconTint={color.ink}
                    title="Plan & billing"
                    subtitle={me.data ? planLine(me.data) : ' '}
                    onPress={() => router.push('/billing')}
                    trailing={
                        locked ? (
                            <View style={{ height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: color.ink, justifyContent: 'center' }}>
                                <Text style={[text.badge, { fontSize: 11, color: color.white }]}>Choose a plan</Text>
                            </View>
                        ) : undefined
                    }
                />

                <Pressable
                    onPress={() => confirmSignOut(me.data?.user.email)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                        height: 52,
                        marginTop: 4,
                        borderRadius: radius.pill,
                        borderWidth: 1.5,
                        borderColor: color.dangerBorder,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.8 : 1,
                    })}
                >
                    <Text style={[text.cta, { color: color.danger }]}>Log out</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

function StatTile({ value, label, bg, fg, tilt }: { value: string; label: string; bg: string; fg: string; tilt: string }) {
    return (
        <View style={{ flex: 1, height: 112, padding: 14, borderRadius: 22, backgroundColor: bg, justifyContent: 'space-between', transform: [{ rotate: tilt }] }}>
            <Text style={{ fontFamily: font.serif, fontSize: 32, lineHeight: 37, color: fg }}>{value}</Text>
            <Text style={{ fontFamily: font.extrabold, fontSize: 12, lineHeight: 15, color: fg }}>{label}</Text>
        </View>
    );
}

function SettingRow({
    icon,
    iconBg,
    iconTint,
    title,
    subtitle,
    onPress,
    trailing,
}: {
    icon: IconName;
    iconBg: string;
    iconTint: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    trailing?: ReactNode;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => ({
                minHeight: 68,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 22,
                backgroundColor: color.surface,
                borderWidth: 1,
                borderColor: color.hairline,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
        >
            <View style={{ width: HIT, height: HIT, borderRadius: 14, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={20} tint={iconTint} weight={2.2} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>{title}</Text>
                <Text numberOfLines={1} style={[text.meta, { fontFamily: font.semibold, fontSize: 12.5, color: color.muted }]}>{subtitle}</Text>
            </View>
            {trailing ?? <Icon name="chevronRight" size={16} tint={color.inactiveFg} weight={2.6} />}
        </Pressable>
    );
}
