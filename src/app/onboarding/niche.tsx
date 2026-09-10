import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PrepHeading, Progress } from '@/components/Prep';
import { Button, Chip, Gutter, Screen } from '@/components/ui';
import { NICHES } from '@/data/mock';
import { color, radius, space, text } from '@/theme';

export default function Niche() {
    const [picked, setPicked] = useState<string[]>(['Food & Drink', 'Lifestyle']);
    const toggle = (n: string) =>
        setPicked((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

    return (
        <Screen
            footer={
                <View style={{ flexDirection: 'row', gap: space.md }}>
                    <BackButton onPress={() => router.back()} />
                    <View style={{ flex: 1 }}>
                        <Button label="Continue →" onPress={() => router.push('/onboarding/goal')} />
                    </View>
                </View>
            }
        >
            <Gutter style={{ paddingHorizontal: space.xxl }}>
                <Progress step={1} total={4} />
                <PrepHeading
                    eyebrow="PREP · YOUR INGREDIENTS"
                    title="What do you make content about?"
                    sub="Pick a few — this seasons every idea we cook up for you."
                />
                <View style={{ paddingTop: 26, flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
                    {NICHES.map((n) => (
                        <Chip key={n} label={n} selected={picked.includes(n)} onPress={() => toggle(n)} />
                    ))}
                </View>
            </Gutter>
        </Screen>
    );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                height: 56,
                paddingHorizontal: 22,
                borderRadius: radius.field,
                backgroundColor: color.surface,
                borderWidth: 1.5,
                borderColor: color.fieldBorder,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={[text.ctaSm, { color: color.muted }]}>Back</Text>
        </Pressable>
    );
}
