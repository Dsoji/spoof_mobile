/**
 * Shared chrome for the onboarding prep steps: the step bar, the eyebrow /
 * headline / subhead block, and Back + Continue. Copy comes from the web flow's
 * STEP_META so the two clients ask the same questions in the same voice.
 */

import { Pressable, Text, View } from 'react-native';

import { Eyebrow, PillButton } from './ui';
import { color, font, radius, space, text, tone } from '@/theme';

/**
 * Two questions, then straight into the app. Connecting a channel is not a
 * step: it needs a paid plan, so asking for it before someone has seen the app
 * is asking them to pay at the door. It lives where you meet the need — compose.
 */
export const PREP_STEPS = 2;

/**
 * One segment per step: done ones brand, the current one accent, the rest
 * waiting. Segments rather than a fill, so "how many are left" is countable.
 */
export function Progress({ step, total = PREP_STEPS }: { step: number; total?: number }) {
    return (
        <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${step} of ${total}`}
        >
            <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                {Array.from({ length: total }, (_, i) => (
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            height: 8,
                            borderRadius: radius.pill,
                            backgroundColor: i + 1 < step ? color.brand : i + 1 === step ? color.accent : color.inactive,
                        }}
                    />
                ))}
            </View>
            <Text style={{ fontFamily: font.extrabold, fontSize: 12, color: color.muted }}>{`${step} of ${total}`}</Text>
        </View>
    );
}

export function PrepHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
    return (
        <View style={{ paddingTop: 22, gap: 10 }}>
            <Eyebrow step>{eyebrow}</Eyebrow>
            <Text style={[text.display, { fontSize: 36, lineHeight: 41 }]}>{title}</Text>
            <Text style={[text.bodyLg, { fontSize: 15, lineHeight: 22 }]}>{sub}</Text>
        </View>
    );
}

/** Back + the step's forward action, for a screen's pinned footer. */
export function PrepFooter({
    cta,
    onNext,
    onBack,
    disabled,
}: {
    cta: string;
    onNext: () => void;
    onBack?: () => void;
    disabled?: boolean;
}) {
    return (
        <View style={{ flexDirection: 'row', gap: 10 }}>
            {onBack ? (
                <Pressable
                    onPress={onBack}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                        height: 56,
                        paddingHorizontal: 22,
                        borderRadius: radius.pill,
                        backgroundColor: tone.sand,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                    })}
                >
                    <Text style={[text.ctaSm, { color: color.ink }]}>Back</Text>
                </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
                <PillButton label={cta} onPress={onNext} disabled={disabled} />
            </View>
        </View>
    );
}

export const PREP_GUTTER = space.xxl;
