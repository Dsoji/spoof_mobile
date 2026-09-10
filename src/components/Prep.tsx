/**
 * Shared chrome for the onboarding prep steps: the gradient progress bar and
 * the eyebrow / headline / subhead block. Copy comes from the web flow's
 * STEP_META so the two clients ask the same questions in the same voice.
 */

import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Eyebrow } from './ui';
import { color, radius, space, text } from '@/theme';

/**
 * The purple→orange progress fill.
 *
 * Drawn as SVG rather than a gradient library: it is the only gradient in the
 * app besides the logo, and a whole dependency for one bar is not worth it.
 */
export function Progress({ step, total }: { step: number; total: number }) {
    return (
        <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: color.hairline, overflow: 'hidden' }}>
            <View style={{ width: `${(step / total) * 100}%`, height: '100%' }}>
                <Svg width="100%" height="100%">
                    <Defs>
                        <LinearGradient id="prep" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor={color.brand} />
                            <Stop offset="1" stopColor={color.accent} />
                        </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" rx="3" fill="url(#prep)" />
                </Svg>
            </View>
        </View>
    );
}

export function PrepHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
    return (
        <View style={{ paddingTop: 32, gap: 12 }}>
            <Eyebrow step>{eyebrow}</Eyebrow>
            <Text style={text.display}>{title}</Text>
            <Text style={[text.bodyLg, { fontSize: 15.5, lineHeight: 23 }]}>{sub}</Text>
        </View>
    );
}

/** Back + Continue, pinned above the home indicator. */
export function PrepNav({ cta, onNext, onBack }: { cta: string; onNext?: () => void; onBack?: () => void }) {
    return { cta, onNext, onBack };
}

export const PREP_GUTTER = space.xxl;
