import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Badge, Card, Gutter, Screen, SectionHeader } from '@/components/ui';
import { me, notes, posts, STREAK } from '@/data/mock';
import { color, font, graphRamp, radius, shadow, space, text } from '@/theme';

/**
 * Home — streak, quick actions, recent notes, recent posts.
 *
 * Each band is one endpoint: activity, notes, posts. Two rows per list is
 * deliberate; the point is a glance, and "See all" is right there.
 */
export default function Home() {
    return (
        <Screen scroll>
            <Gutter style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <View style={{ gap: 5 }}>
                    <Text style={text.eyebrow}>Thursday, 10 Sep</Text>
                    <Text style={[text.displayLg, { fontSize: 30, lineHeight: 36 }]}>Evening, {me.name}</Text>
                </View>
                <Avatar />
            </Gutter>

            {/* Streak. A 14-day strip, not the year grid — that lives on You,
                where there is room for 52 weeks. */}
            <Gutter style={{ paddingTop: 20 }}>
                <Card padded={0}>
                    <View style={{ paddingHorizontal: 20, paddingTop: 17, paddingBottom: 18, gap: 15 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                                <Text style={[text.display, { fontSize: 32, lineHeight: 38 }]}>{STREAK.days}</Text>
                                <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: color.muted }}>
                                    day streak
                                </Text>
                            </View>
                            <Text style={[text.meta, { fontFamily: font.bold, fontSize: 11.5 }]}>Keep it warm</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                            {STREAK.strip.map((lv, i) => (
                                <View
                                    key={i}
                                    style={{ flex: 1, aspectRatio: 1, borderRadius: 4, backgroundColor: graphRamp[lv] }}
                                />
                            ))}
                        </View>
                    </View>
                </Card>
            </Gutter>

            <Gutter style={{ paddingTop: 14, flexDirection: 'row', gap: 10 }}>
                <QuickAction label="Jot a note" icon="plus" primary onPress={() => router.push('/capture')} />
                <QuickAction label="New post" icon="send" onPress={() => router.push('/compose')} />
                <QuickAction label="Schedule" icon="calendar" onPress={() => router.push('/(tabs)/calendar')} />
            </Gutter>

            <Gutter style={{ paddingTop: 24, gap: 11 }}>
                <SectionHeader label="Recent notes" action="See all" />
                <View style={{ gap: 9 }}>
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
                <SectionHeader label="Recent posts" action="See all" />
                <View style={{ gap: 9 }}>
                    {posts.map((p) => (
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
                                        backgroundColor: p.status === 'scheduled' ? color.brandTint : color.field,
                                        borderWidth: p.status === 'scheduled' ? 0 : 1,
                                        borderColor: color.hairline,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon
                                        name="image"
                                        size={18}
                                        tint={p.status === 'scheduled' ? color.brand : color.muted}
                                        weight={1.9}
                                    />
                                </View>
                                <View style={{ flex: 1, gap: 5 }}>
                                    <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 13.5, color: color.ink }}>
                                        {p.caption}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                                        {p.status === 'scheduled' ? (
                                            <Badge>{p.whenLabel}</Badge>
                                        ) : (
                                            <Badge tone="success">Published</Badge>
                                        )}
                                        <Text style={[text.meta, { fontFamily: font.bold, fontSize: 10.5 }]}>
                                            {p.metaLabel ?? p.platforms.join(' · ')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </Card>
                    ))}
                </View>
            </Gutter>
        </Screen>
    );
}

export function Avatar() {
    return (
        <View
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
            <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: color.brand }}>{me.initial}</Text>
        </View>
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
