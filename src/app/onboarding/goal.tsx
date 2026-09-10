import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PrepHeading, Progress } from '@/components/Prep';
import { Button, Card, Gutter, Radio, Screen } from '@/components/ui';
import { BackButton } from './niche';
import { Icon } from '@/components/Icon';
import { GOALS } from '@/data/mock';
import { color, font, radius, space, text } from '@/theme';

export default function Goal() {
    const [picked, setPicked] = useState<string>('consistent');

    return (
        <Screen
            footer={
                <View style={{ flexDirection: 'row', gap: space.md }}>
                    <BackButton onPress={() => router.back()} />
                    <View style={{ flex: 1 }}>
                        <Button label="Start cooking →" onPress={() => router.push('/onboarding/channels')} />
                    </View>
                </View>
            }
        >
            <Gutter style={{ paddingHorizontal: space.xxl }}>
                <Progress step={3} total={4} />
                <PrepHeading
                    eyebrow="PREP · THE ORDER"
                    title="What are you cooking up first?"
                    sub="Your main goal right now — we’ll put the right tools out front."
                />
                <View style={{ paddingTop: 26, gap: space.md }}>
                    {GOALS.map((g) => {
                        const on = g.value === picked;
                        return (
                            <Pressable key={g.value} onPress={() => setPicked(g.value)}>
                                <Card selected={on} padded={0} style={on ? { backgroundColor: color.brandWash } : undefined}>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 16,
                                            paddingHorizontal: 17,
                                            paddingVertical: 15,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 46,
                                                height: 46,
                                                borderRadius: radius.field,
                                                backgroundColor: on ? color.brand : color.brandTint,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon name={g.icon} size={22} tint={on ? color.white : color.brand} />
                                        </View>
                                        <View style={{ flex: 1, gap: 3 }}>
                                            <Text style={{ fontFamily: font.bold, fontSize: 16, color: color.ink }}>
                                                {g.title}
                                            </Text>
                                            <Text style={{ fontFamily: font.medium, fontSize: 13.5, lineHeight: 18, color: color.muted }}>
                                                {g.desc}
                                            </Text>
                                        </View>
                                        <Radio selected={on} />
                                    </View>
                                </Card>
                            </Pressable>
                        );
                    })}
                </View>
            </Gutter>
        </Screen>
    );
}
