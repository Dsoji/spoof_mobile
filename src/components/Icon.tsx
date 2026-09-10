/**
 * The icon set, as stroked SVG paths on a 24×24 grid.
 *
 * Drawn rather than pulled from a library so every glyph shares one weight and
 * corner treatment, and so they recolour with the theme instead of shipping as
 * bitmaps. Emoji are never used as icons — the brand doesn't use them.
 */

import { Text, View, type ColorValue } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import {
    BRAND_INDIGO,
    BRAND_ORANGE,
    SWIRL_ARM_BOTTOM,
    SWIRL_ARM_TOP,
    SWIRL_VIEWBOX,
    swirlStrokeFor,
} from '@/theme/brand-mark';
import { color, font } from '@/theme';

export type IconName = keyof typeof PATHS;

/** Each entry is the inner geometry of a 24×24 `stroke`d icon. */
const PATHS = {
    plus: (p: Common) => <Path {...p} d="M12 5v14M5 12h14" />,
    check: (p: Common) => <Path {...p} d="M5 12.5l4.5 4.5L19 7" />,
    chevronLeft: (p: Common) => <Path {...p} d="M14.5 5L8 12l6.5 7" />,
    chevronRight: (p: Common) => <Path {...p} d="M9.5 5L16 12l-6.5 7" />,

    clock: (p: Common) => (
        <>
            <Circle {...p} cx={12} cy={12} r={9} />
            <Path {...p} d="M12 7.5V12l3 2" />
        </>
    ),
    calendar: (p: Common) => (
        <>
            <Rect {...p} x={3} y={5} width={18} height={16} rx={3} />
            <Path {...p} d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    notes: (p: Common) => (
        <>
            <Rect {...p} x={4} y={3} width={16} height={18} rx={3} />
            <Path {...p} d="M8.5 8.5h7M8.5 12.5h7M8.5 16.5h4" />
        </>
    ),
    home: (p: Common) => (
        <>
            <Path {...p} d="M4 10.5L12 4l8 6.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <Path {...p} d="M9.5 21v-6h5v6" />
        </>
    ),
    grid: (p: Common) => (
        <>
            <Rect {...p} x={3.5} y={3.5} width={7} height={7} rx={2} />
            <Rect {...p} x={13.5} y={3.5} width={7} height={7} rx={2} />
            <Rect {...p} x={3.5} y={13.5} width={7} height={7} rx={2} />
            <Rect {...p} x={13.5} y={13.5} width={7} height={7} rx={2} />
        </>
    ),
    image: (p: Common) => (
        <>
            <Rect {...p} x={3} y={4.5} width={18} height={15} rx={3} />
            <Circle {...p} cx={8.5} cy={10} r={1.6} />
            <Path {...p} d="M4 17l4.5-4.5 3.5 3.5 3-2.5L20 18" />
        </>
    ),
    send: (p: Common) => (
        <>
            <Path {...p} d="M20.5 3.5L11 13" />
            <Path {...p} d="M20.5 3.5l-6.2 17-3.3-7.5L3.5 9.7z" />
        </>
    ),
    sparkle: (p: Common) => <Path {...p} d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z" />,
    file: (p: Common) => (
        <>
            <Path {...p} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <Path {...p} d="M14 3v5h5" />
        </>
    ),
    trash: (p: Common) => <Path {...p} d="M4 7h16M9.5 7V4.8h5V7M6.5 7l1 13h9l1-13" />,
    lock: (p: Common) => (
        <>
            <Rect {...p} x={4} y={10.5} width={16} height={10} rx={3} />
            <Path {...p} d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </>
    ),
    card: (p: Common) => (
        <>
            <Rect {...p} x={2.5} y={5} width={19} height={14} rx={3} />
            <Path {...p} d="M2.5 10h19" />
        </>
    ),
    bank: (p: Common) => (
        <>
            <Path {...p} d="M3.5 9.5L12 4.5l8.5 5" />
            <Path {...p} d="M5.5 9.5v8M18.5 9.5v8M9.5 9.5v8M14.5 9.5v8" />
            <Path {...p} d="M3 20h18" />
        </>
    ),
    phone: (p: Common) => (
        <>
            <Rect {...p} x={6} y={2.5} width={12} height={19} rx={3} />
            <Path {...p} d="M10.5 18.5h3" />
        </>
    ),
    repeat: (p: Common) => (
        <>
            <Path {...p} d="M4 9.5A5.5 5.5 0 0 1 9.5 4H18" />
            <Path {...p} d="M15 1.5L18.5 4 15 6.5" />
            <Path {...p} d="M20 14.5A5.5 5.5 0 0 1 14.5 20H6" />
            <Path {...p} d="M9 17.5L5.5 20 9 22.5" />
        </>
    ),
    trend: (p: Common) => (
        <>
            <Path {...p} d="M4 16.5l5.5-5.5 3.5 3.5L20 7" />
            <Path {...p} d="M15 7h5v5" />
        </>
    ),
    cart: (p: Common) => (
        <>
            <Path {...p} d="M3.5 4h2.2l2.3 10.5h9.2l2.3-7.5H7" />
            <Circle {...p} cx={9.5} cy={19} r={1.6} />
            <Circle {...p} cx={17} cy={19} r={1.6} />
        </>
    ),
    external: (p: Common) => (
        <>
            <Path {...p} d="M14 4h6v6" />
            <Path {...p} d="M20 4l-9 9" />
            <Path {...p} d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
        </>
    ),
    info: (p: Common) => (
        <>
            <Circle {...p} cx={12} cy={12} r={9} />
            <Path {...p} d="M12 11v5.5M12 7.8v.2" />
        </>
    ),
    arrowRight: (p: Common) => <Path {...p} d="M5 12h13M12.5 6l6 6-6 6" />,
} as const;

type Common = {
    stroke: ColorValue;
    strokeWidth: number;
    strokeLinecap: 'round';
    strokeLinejoin: 'round';
    fill: 'none';
};

export function Icon({
    name,
    size = 22,
    tint = color.ink,
    weight = 2,
}: {
    name: IconName;
    size?: number;
    /** Accepts a ColorValue so navigator-supplied tints pass straight through. */
    tint?: ColorValue;
    /** Stroke width on the 24-grid; scale it up for small sizes. */
    weight?: number;
}) {
    const common: Common = {
        stroke: tint,
        strokeWidth: weight,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
    };
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            {PATHS[name](common)}
        </Svg>
    );
}

/**
 * The Apple and Google wordmarks.
 *
 * Separate from `PATHS` on purpose: those are stroked outlines on a shared
 * 24×24 grid that recolour with the theme, and these are filled third-party
 * brand marks that may not be restyled. The hex values below are Apple's and
 * Google's, not ours — they are deliberately absent from `tokens.ts`, and
 * nothing else in the app may reach for them.
 */
export function AppleMark({ size = 20, tint = '#ffffff' }: { size?: number; tint?: ColorValue }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                fill={tint}
                d="M17.05 12.54c-.02-2.69 2.2-3.98 2.3-4.05-1.25-1.83-3.2-2.08-3.89-2.1-1.65-.17-3.23.97-4.07.97-.84 0-2.13-.95-3.51-.92-1.8.03-3.47 1.05-4.4 2.66-1.87 3.26-.48 8.07 1.35 10.71.9 1.29 1.96 2.74 3.36 2.69 1.35-.06 1.86-.87 3.49-.87 1.63 0 2.09.87 3.51.84 1.45-.02 2.37-1.32 3.26-2.61 1.03-1.5 1.45-2.95 1.47-3.03-.03-.01-2.83-1.08-2.86-4.31z"
            />
            <Path
                fill={tint}
                d="M14.9 4.6c.74-.9 1.24-2.15 1.11-3.4-1.07.05-2.37.72-3.14 1.62-.69.8-1.29 2.07-1.13 3.29 1.2.09 2.42-.61 3.16-1.51z"
            />
        </Svg>
    );
}

export function GoogleMark({ size = 20 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
            <Path
                fill="#4285F4"
                d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
            />
            <Path
                fill="#34A853"
                d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
            />
            <Path
                fill="#FBBC05"
                d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
            />
            <Path
                fill="#EA4335"
                d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
            />
        </Svg>
    );
}

export function SwirlMark({ size = 62 }: { size?: number }) {
    const stroke = swirlStrokeFor(size);
    const common = {
        strokeWidth: stroke,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
    } as const;
    return (
        <Svg width={size} height={size} viewBox={`0 0 ${SWIRL_VIEWBOX} ${SWIRL_VIEWBOX}`}>
            <Path {...common} d={SWIRL_ARM_TOP} stroke={BRAND_ORANGE} />
            <Path {...common} d={SWIRL_ARM_BOTTOM} stroke={BRAND_INDIGO} />
        </Svg>
    );
}


/**
 * The mark plus the name, as the studio locks them up.
 *
 * The proportions are the web `Logo` component's `variant="full"`: the name
 * sets at 0.78× the mark's height with a 0.36× gap, so the pair scales from
 * one number. `letterSpacing` is RN's absolute points rather than the web's
 * em, hence the multiply.
 *
 * `mark={false}` drops the swirl and keeps the name's type treatment, for the
 * one place that already has a mark on screen — the splash, where the lockup's
 * own small swirl would sit directly under the large one.
 */
export function Wordmark({
    size = 34,
    tint = color.ink,
    mark = true,
}: {
    size?: number;
    tint?: ColorValue;
    mark?: boolean;
}) {
    const fontSize = Math.round(size * 0.78);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.36) }}>
            {mark && <SwirlMark size={size} />}
            <Text
                style={{
                    fontFamily: font.extrabold,
                    fontSize,
                    // The serif-heading leading rule doesn't apply here: this is
                    // Jakarta, and a lockup wants the glyph box, not a line box.
                    lineHeight: fontSize * 1.1,
                    letterSpacing: fontSize * -0.03,
                    color: tint,
                }}
            >
                Spoof Kitchen
            </Text>
        </View>
    );
}
