import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PREP_GUTTER, PrepFooter, PrepHeading, Progress } from '@/components/Prep';
import { Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { GOALS } from '@/data/mock';
import { color, font, shadow, text } from '@/theme';

/** The chosen card's tilt, per position, so the grid does not lean one way. */
const TILTS = ['-1.5deg', '1.5deg', '1deg', '-1deg'];

export default function Goal() {
    const [picked, setPicked] = useState<string>('consistent');
    // Two by two. RN has no grid, so rows of two flex children.
    const rows = [GOALS.slice(0, 2), GOALS.slice(2, 4)];

    return (
        <Screen
            scroll
            footer={<PrepFooter cta="Start cooking" onBack={() => router.back()} onNext={() => router.replace('/(tabs)')} />}
        >
            <View style={{ paddingHorizontal: PREP_GUTTER }}>
                <Progress step={2} />
                <PrepHeading
                    eyebrow="PREP · THE ORDER"
                    title="What are you cooking up first?"
                    sub="Your main goal right now — we’ll put the right tools out front."
                />
                <View style={{ paddingTop: 24, gap: 12 }}>
                    {rows.map((row, r) => (
                        <View key={r} style={{ flexDirection: 'row', gap: 12 }}>
                            {row.map((g, c) => {
                                const on = g.value === picked;
                                return (
                                    <Pressable
                                        key={g.value}
                                        onPress={() => setPicked(g.value)}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: on }}
                                        accessibilityLabel={`${g.title}. ${g.desc}`}
                                        style={({ pressed }) => [
                                            {
                                                flex: 1,
                                                minHeight: 176,
                                                padding: 14,
                                                borderRadius: 24,
                                                backgroundColor: on ? color.ink : color.surface,
                                                borderWidth: on ? 0 : 1.5,
                                                borderColor: color.hairline,
                                                justifyContent: 'space-between',
                                                gap: 12,
                                                transform: [{ rotate: on ? TILTS[r * 2 + c] : '0deg' }, { scale: pressed ? 0.97 : 1 }],
                                            },
                                            on && shadow.liftDark,
                                        ]}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 14,
                                                    backgroundColor: on ? color.accent : color.brandTint,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Icon name={g.icon} size={22} tint={on ? color.ink : color.brand} weight={2.2} />
                                            </View>
                                            <View
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    backgroundColor: on ? color.brand : 'transparent',
                                                    borderWidth: on ? 0 : 1.5,
                                                    borderColor: color.chipDotBorder,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {on ? <Icon name="check" size={13} tint={color.white} weight={3.4} /> : null}
                                            </View>
                                        </View>
                                        <View style={{ gap: 4 }}>
                                            <Text style={{ fontFamily: font.serif, fontSize: 21, lineHeight: 24, color: on ? color.white : color.ink }}>{g.title}</Text>
                                            <Text style={[text.meta, { fontFamily: font.semibold, fontSize: 12.5, lineHeight: 17, color: on ? color.inactive : color.muted }]}>
                                                {g.desc}
                                            </Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </View>
        </Screen>
    );
}
