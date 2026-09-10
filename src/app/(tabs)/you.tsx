import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Badge, Card, Gutter, ListRow, Screen } from '@/components/ui';
import { ACTIVITY, me, STATS } from '@/data/mock';
import { toast } from '@/components/Toast';
import { clearToken } from '@/api/session';
import { resetNotes } from '@/api/useNotes';
import { color, font, graphRamp, HIT, radius, space, text } from '@/theme';

const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep'];

/**
 * The contribution graph.
 *
 * Reads `activity_logs`, which is already collecting across ideas, posting and
 * AI — but boards.ts logs nothing, so notes contribute zero today. That gap has
 * to close before this screen tells the truth.
 */
/**
 * Sign out.
 *
 * Drops the bearer token and everything fetched with it, then sends the user
 * back to the first-launch screen with `replace` so the tabs are gone from the
 * history stack and a back gesture cannot walk into a signed-out session.
 *
 * The session row itself still lives on the studio until it expires — revoking
 * it needs an endpoint that does not exist yet (docs/API_CONTRACT.md). Until
 * then this is a local sign-out, which is why a failed keychain delete has to
 * be surfaced rather than swallowed: the token would still be on disk and the
 * next launch would quietly restore it.
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

function confirmSignOut() {
    Alert.alert('Log out?', `You'll need a new code to get back into ${me.email}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
}

export default function You() {
    const columns = Array.from({ length: ACTIVITY.cols }, (_, c) =>
        ACTIVITY.cells.slice(c * ACTIVITY.rows, c * ACTIVITY.rows + ACTIVITY.rows),
    );

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
                    <Text style={{ fontFamily: font.extrabold, fontSize: 17, color: color.brand }}>{me.initial}</Text>
                </View>
                <View style={{ gap: 3 }}>
                    <Text style={[text.title, { letterSpacing: -0.2 }]}>{me.name}</Text>
                    <Text style={[text.meta, { fontFamily: font.semibold }]}>{me.workspace} · 2 channels</Text>
                </View>
            </Gutter>

            <Gutter style={{ paddingTop: 24 }}>
                <Card padded={20}>
                    <View style={{ gap: 18 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            <View style={{ gap: 4 }}>
                                <Text style={text.eyebrow}>Current streak</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
                                    <Text style={[text.displayLg, { fontSize: 40, lineHeight: 46 }]}>12</Text>
                                    <Text style={{ fontFamily: font.bold, fontSize: 14, color: color.muted }}>days</Text>
                                </View>
                            </View>
                            <Badge tone="success">Best yet</Badge>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            {MONTHS.map((m) => (
                                <Text
                                    key={m}
                                    style={{
                                        fontFamily: font.extrabold,
                                        fontSize: 9.5,
                                        letterSpacing: 0.8,
                                        color: color.inactiveFg,
                                        textTransform: 'uppercase',
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
                                    {week.map((lv, r) => (
                                        <View
                                            key={r}
                                            style={{ aspectRatio: 1, borderRadius: 4, backgroundColor: graphRamp[lv] }}
                                        />
                                    ))}
                                </View>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                            <Text style={[text.meta, { fontFamily: font.bold, fontSize: 10, marginRight: 3 }]}>Less</Text>
                            {graphRamp.map((c) => (
                                <View key={c} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: c }} />
                            ))}
                            <Text style={[text.meta, { fontFamily: font.bold, fontSize: 10, marginLeft: 3 }]}>More</Text>
                        </View>
                    </View>
                </Card>
            </Gutter>

            <Gutter style={{ paddingTop: 12, flexDirection: 'row', gap: 10 }}>
                {STATS.map((s) => (
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
                        You jot most on Sunday nights. Four of them turned into posts.
                    </Text>
                </View>
            </Gutter>

            <Gutter style={{ paddingTop: 22, gap: 9 }}>
                <ListRow
                    title="Plan & billing"
                    subtitle={`${me.plan} · renews 10 October`}
                    icon="lock"
                    onPress={() => router.push('/billing')}
                />
            </Gutter>

            <Gutter style={{ paddingTop: 10 }}>
                <Pressable
                    onPress={confirmSignOut}
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
