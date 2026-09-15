import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Badge, Card, Gutter, ListRow, Screen } from '@/components/ui';
import { Failed } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { clearToken } from '@/api/session';
import { resetNotes } from '@/api/useNotes';
import { useActivity, useMe } from '@/api/resources';
import { firstName, initialOf, type Me } from '@/api/me';
import { weekdayIndex, type ActivityDay } from '@/api/activity';
import { reminderLabel } from '@/api/format';
import { color, font, graphRamp, HIT, radius, text } from '@/theme';

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
    return columns.map((week) => {
        const first = week.find((d): d is ActivityDay => d !== null);
        if (!first) return '';
        const month = new Date(`${first.date}T00:00:00Z`).toLocaleString(undefined, { month: 'short', timeZone: 'UTC' });
        if (month === previous) return '';
        previous = month;
        return month;
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
    const me = useMe();
    const activity = useActivity();

    const days = activity.data?.days ?? [];
    const columns = graphColumns(days);
    const months = monthLabels(columns);
    const busiest = busiestWeekday(days);
    const stats = activity.data?.stats;
    const channelCount = me.data?.channels.used;

    return (
        <Screen scroll>
            <Gutter style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: color.brandTint,
                        borderWidth: 1,
                        borderColor: color.hairline,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{ fontFamily: font.extrabold, fontSize: 17, color: color.brand }}>{initialOf(me.data)}</Text>
                </View>
                <View style={{ gap: 3, flex: 1 }}>
                    <Text numberOfLines={1} style={[text.title, { letterSpacing: -0.2 }]}>
                        {me.data ? (me.data.user.name ?? firstName(me.data)) : ' '}
                    </Text>
                    <Text numberOfLines={1} style={[text.meta, { fontFamily: font.semibold }]}>
                        {me.data
                            ? `${me.data.workspace.name}${channelCount === null || channelCount === undefined ? '' : ` · ${channelCount} ${channelCount === 1 ? 'channel' : 'channels'}`}`
                            : ' '}
                    </Text>
                </View>
            </Gutter>

            {me.status === 'error' && !me.data ? (
                <Gutter>
                    <Failed message={me.error} onRetry={me.refresh} />
                </Gutter>
            ) : null}

            <Gutter style={{ paddingTop: 24 }}>
                <Card padded={20}>
                    <View style={{ gap: 18 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            <View style={{ gap: 4 }}>
                                <Text style={text.eyebrow}>Current streak</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
                                    <Text style={[text.displayLg, { fontSize: 40, lineHeight: 46 }]}>
                                        {activity.data ? activity.data.streak : '–'}
                                    </Text>
                                    <Text style={{ fontFamily: font.bold, fontSize: 14, color: color.muted }}>
                                        {activity.data?.streak === 1 ? 'day' : 'days'}
                                    </Text>
                                </View>
                            </View>
                            {/* Only when it is true: the current run is the longest in the window. */}
                            {activity.data && activity.data.streak > 0 && activity.data.streak === activity.data.best ? (
                                <Badge tone="success">Best yet</Badge>
                            ) : null}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 4 }}>
                            {months.map((m, i) => (
                                <Text
                                    key={i}
                                    numberOfLines={1}
                                    style={{
                                        flex: 1,
                                        fontFamily: font.extrabold,
                                        fontSize: 9.5,
                                        letterSpacing: 0.8,
                                        color: color.inactiveFg,
                                        textTransform: 'uppercase',
                                        overflow: 'visible',
                                    }}
                                >
                                    {m}
                                </Text>
                            ))}
                        </View>

                        {/* One column per week; RN has no grid, so weeks are flex columns. */}
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                            {columns.map((week, c) => (
                                <View key={c} style={{ flex: 1, gap: 4 }}>
                                    {week.map((day, r) => (
                                        <View
                                            key={r}
                                            style={{
                                                aspectRatio: 1,
                                                borderRadius: 4,
                                                backgroundColor: day ? graphRamp[day.level] : 'transparent',
                                            }}
                                        />
                                    ))}
                                </View>
                            ))}
                        </View>

                        {activity.status === 'error' && !activity.data ? (
                            <Failed message={activity.error} onRetry={activity.refresh} />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                                <Text style={[text.meta, { fontFamily: font.bold, fontSize: 10, marginRight: 3 }]}>Less</Text>
                                {graphRamp.map((c) => (
                                    <View key={c} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: c }} />
                                ))}
                                <Text style={[text.meta, { fontFamily: font.bold, fontSize: 10, marginLeft: 3 }]}>More</Text>
                            </View>
                        )}
                    </View>
                </Card>
            </Gutter>

            <Gutter style={{ paddingTop: 12, flexDirection: 'row', gap: 10 }}>
                {[
                    { value: stats ? String(stats.notesJotted) : '–', label: 'notes jotted' },
                    { value: stats ? String(stats.postsPublished) : '–', label: 'posts published' },
                    {
                        // Nothing records which post a note became, so this is
                        // unknown rather than zero — a dash, not a made-up number.
                        value: stats?.notesShippedRatio == null ? '–' : `${Math.round(stats.notesShippedRatio * 100)}%`,
                        label: 'notes that shipped',
                    },
                ].map((s) => (
                    <View key={s.label} style={{ flex: 1 }}>
                        <Card padded={0}>
                            <View style={{ paddingHorizontal: 13, paddingVertical: 15, gap: 6 }}>
                                <Text style={[text.displaySm, { fontSize: 26, lineHeight: 31 }]}>{s.value}</Text>
                                <Text style={{ fontFamily: font.bold, fontSize: 10.5, lineHeight: 14, color: color.subtle }}>
                                    {s.label}
                                </Text>
                            </View>
                        </Card>
                    </View>
                ))}
            </Gutter>

            {busiest ? (
                <Gutter style={{ paddingTop: 18 }}>
                    <View
                        style={{
                            backgroundColor: color.brandTint,
                            borderRadius: radius.card,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <Icon name="sparkle" size={19} tint={color.brand} />
                        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, lineHeight: 19, color: color.ink }}>
                            {`${busiest}s are when you make the most.`}
                        </Text>
                    </View>
                </Gutter>
            ) : null}

            <Gutter style={{ paddingTop: 22, gap: 9 }}>
                <ListRow
                    title="Kitchen"
                    subtitle={me.data ? `${me.data.workspace.name} · switch` : 'Switch kitchens'}
                    icon="grid"
                    onPress={() => router.push('/kitchens')}
                />
                <ListRow
                    title="Plan & billing"
                    subtitle={me.data ? planLine(me.data) : ' '}
                    icon="lock"
                    onPress={() => router.push('/billing')}
                />
            </Gutter>

            <Gutter style={{ paddingTop: 10 }}>
                <Pressable
                    onPress={() => confirmSignOut(me.data?.user.email)}
                    style={({ pressed }) => ({
                        minHeight: HIT,
                        height: 52,
                        borderRadius: radius.cta,
                        backgroundColor: color.surface,
                        borderWidth: 1.5,
                        borderColor: color.dangerBorder,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.9 : 1,
                    })}
                >
                    <Text style={[text.cta, { color: color.danger }]}>Log out</Text>
                </Pressable>
            </Gutter>
        </Screen>
    );
}
