import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PREP_GUTTER, PrepFooter, PrepHeading, Progress } from '@/components/Prep';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/ui';
import { NICHES } from '@/data/mock';
import { color, font, radius, text, tone } from '@/theme';

/** Picked chips cycle through these, so a handful of picks reads as a mix rather than one block. */
const FACES = [
    { bg: color.brand, fg: color.white },
    { bg: color.accent, fg: color.ink },
    { bg: color.ink, fg: color.white },
    { bg: tone.orchid, fg: color.ink },
] as const;

export default function Niche() {
    const [picked, setPicked] = useState<string[]>(['Food & Drink', 'Lifestyle']);
    const toggle = (n: string) => setPicked((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

    return (
        <Screen
            scroll
            footer={
                <View style={{ gap: 12 }}>
                    <View
                        style={{
                            alignSelf: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: radius.pill,
                            backgroundColor: picked.length ? color.brandTint : tone.sand,
                        }}
                    >
                        <Text style={[text.badge, { fontSize: 12.5, color: picked.length ? color.chipSelectedFg : color.muted }]}>
                            {picked.length === 0 ? 'Pick at least one to continue' : `${picked.length} picked — nice mix`}
                        </Text>
                    </View>
                    <PrepFooter
                        cta="Continue"
                        disabled={picked.length === 0}
                        onBack={router.canGoBack() ? () => router.back() : undefined}
                        onNext={() => router.push('/onboarding/goal')}
                    />
                </View>
            }
        >
            <View style={{ paddingHorizontal: PREP_GUTTER }}>
                <Progress step={1} />
                <PrepHeading
                    eyebrow="PREP · YOUR INGREDIENTS"
                    title="What do you make content about?"
                    sub="Pick a few — this seasons every idea we cook up for you."
                />
                <View style={{ paddingTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {NICHES.map((n, i) => {
                        const at = picked.indexOf(n);
                        const face = at >= 0 ? FACES[at % FACES.length] : null;
                        return (
                            <Pressable
                                key={n}
                                onPress={() => toggle(n)}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: at >= 0 }}
                                style={({ pressed }) => ({
                                    height: 48,
                                    paddingHorizontal: 18,
                                    borderRadius: radius.pill,
                                    backgroundColor: face ? face.bg : color.surface,
                                    borderWidth: face ? 0 : 1.5,
                                    borderColor: color.fieldBorder,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 7,
                                    // Picked ones tilt like stickers slapped on.
                                    transform: [{ rotate: face ? (i % 2 ? '2deg' : '-2deg') : '0deg' }, { scale: pressed ? 0.95 : 1 }],
                                })}
                            >
                                {face ? <Icon name="check" size={14} tint={face.fg} weight={3.4} /> : null}
                                <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: face ? face.fg : color.chipFg }}>{n}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </Screen>
    );
}
