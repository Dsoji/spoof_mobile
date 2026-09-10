import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from './index';
import { Icon } from '@/components/Icon';
import { Badge, Card, Gutter, Screen } from '@/components/ui';
import { notes } from '@/data/mock';
import { color, font, radius, shadow, space, text, HIT } from '@/theme';

const FILTERS = ['All', 'Reminders', 'Used'];

/** The capture inbox — a flat list, no board. */
export default function Notes() {
    const [filter, setFilter] = useState('All');

    return (
        <View style={{ flex: 1 }}>
            <Screen scroll>
                <Gutter style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <View style={{ gap: 6 }}>
                        <Text style={text.eyebrow}>Thursday, 10 Sep</Text>
                        <Text style={text.displayLg}>Notes</Text>
                    </View>
                    <Avatar />
                </Gutter>

                <Gutter style={{ paddingTop: 18, flexDirection: 'row', gap: 8 }}>
                    {FILTERS.map((f) => {
                        const on = f === filter;
                        return (
                            <Pressable
                                key={f}
                                onPress={() => setFilter(f)}
                                style={{
                                    height: HIT,
                                    paddingHorizontal: 16,
                                    borderRadius: radius.pill,
                                    backgroundColor: on ? color.ink : color.surface,
                                    borderWidth: on ? 0 : 1,
                                    borderColor: color.fieldBorder,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                {f === 'Reminders' ? <Icon name="clock" size={13} tint={color.muted} weight={2.1} /> : null}
                                <Text
                                    style={{
                                        fontFamily: font.bold,
                                        fontSize: 12,
                                        color: on ? color.surface : color.muted,
                                    }}
                                >
                                    {f}
                                </Text>
                            </Pressable>
                        );
                    })}
                </Gutter>

                <Gutter style={{ paddingTop: 18, gap: 10 }}>
                    {notes.map((n) => (
                        <Pressable key={n.id} onPress={() => router.push(`/note/${n.id}`)}>
                            <Card>
                                <View style={{ gap: 11 }}>
                                    <Text style={text.body}>{n.text}</Text>
                                    {n.remindLabel || n.state || n.createdLabel ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {n.remindLabel ? <Badge icon="clock">{n.remindLabel}</Badge> : null}
                                            {n.state === 'draft' ? (
                                                <Badge tone="neutral" icon="file">Draft</Badge>
                                            ) : null}
                                            <Text style={[text.meta, { fontFamily: font.semibold, fontSize: 11 }]}>
                                                {n.createdLabel}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </Card>
                        </Pressable>
                    ))}
                </Gutter>
            </Screen>

            {/* Capture is the app's main verb, so it gets a permanent target. */}
            <Pressable
                onPress={() => router.push('/capture')}
                style={[
                    {
                        position: 'absolute',
                        right: space.gutter,
                        bottom: space.xl,
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        backgroundColor: color.brand,
                        alignItems: 'center',
                        justifyContent: 'center',
                    },
                    shadow.fab,
                ]}
            >
                <Icon name="plus" size={26} tint={color.white} weight={2.4} />
            </Pressable>
        </View>
    );
}
