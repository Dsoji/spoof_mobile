/**
 * The icon set, as stroked SVG paths on a 24×24 grid.
 *
 * Drawn rather than pulled from a library so every glyph shares one weight and
 * corner treatment, and so they recolour with the theme instead of shipping as
 * bitmaps. Emoji are never used as icons — the brand doesn't use them.
 */

import type { ColorValue } from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

import { color } from '@/theme';

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
 * The swirl mark — an Archimedean spiral, generated rather than hand-drawn.
 *
 * The first attempt chained semicircles 3px apart under a 6px stroke; the
 * windings touched and it rendered as a solid gradient disc. The pitch here is
 * 10px against a 4.5px stroke, which leaves a visible gap between turns.
 */
const SPIRAL = (() => {
    const inner = 5;
    const outer = 25;
    const turns = 2;
    const thetaMax = turns * 2 * Math.PI;
    const b = (outer - inner) / thetaMax;
    const pts: string[] = [];
    for (let th = 0; th <= thetaMax + 0.001; th += 0.12) {
        const r = inner + b * th;
        pts.push(`${(32 + r * Math.cos(th)).toFixed(1)} ${(32 + r * Math.sin(th)).toFixed(1)}`);
    }
    return `M ${pts[0]} L ${pts.slice(1).join(' L ')}`;
})();

export function SwirlMark({ size = 62 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
            <Defs>
                <LinearGradient id="swirl" x1="4" y1="32" x2="60" y2="32" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor={color.accent} />
                    <Stop offset="0.55" stopColor={color.brand} />
                    <Stop offset="1" stopColor="#4f46e5" />
                </LinearGradient>
            </Defs>
            <Path d={SPIRAL} stroke="url(#swirl)" strokeWidth={4.5} strokeLinecap="round" fill="none" />
        </Svg>
    );
}
