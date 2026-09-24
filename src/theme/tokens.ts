/**
 * Design tokens — mirrored from the web app's `src/app/globals.css` @theme block.
 *
 * These are the SAME hex values the studio ships, not an approximation: the two
 * clients are one product and a drifted palette is what the web app's token
 * block was written to stop. When a colour changes there, change it here.
 *
 * Two groups are additions rather than mirrors, both taken from real web source:
 * `chip` (from register/OnboardingFlow.tsx's Chip component) and `graph` (the
 * activity heatmap ramp, which has no web counterpart yet).
 */

export const color = {
    /* Brand */
    brand: '#7c3aed',
    brandHover: '#6d28d9',
    brandTint: '#f4ecff',
    brandWash: '#faf5ff',

    /* Accent — an accent, never a primary. */
    accent: '#f97316',

    /* Status */
    success: '#1f7a4d',
    successBg: '#e7f4ec',
    danger: '#b91c1c',
    dangerBg: '#fef2f2',
    dangerBorder: '#fecaca',

    /* Warm neutrals */
    cream: '#fefaf6',
    surface: '#fffdfb',
    ink: '#17181f',
    muted: '#6b6f7b',
    subtle: '#8a8a93',
    hairline: '#efe9e1',
    field: '#fbfaf8',
    fieldBorder: '#e8e3db',
    inactive: '#e6e1d9',
    inactiveFg: '#b4b0a8',

    white: '#ffffff',

    /* Chip anatomy, from the web onboarding flow. */
    chipFg: '#2a2d3a',
    chipSelectedFg: '#5b21b6',
    chipDotBorder: '#d6d1c8',
} as const;

/** Activity heatmap ramp: empty → busiest. Warm empty cell, then tints of brand. */
export const graphRamp = ['#f1ece5', '#ead9fb', '#c8a4f4', '#9a5cee', '#7c3aed'] as const;

/**
 * Colour-block fills for cards, stickers and hero decoration. Every value is
 * one already defined above — these are names for using them as surfaces, not
 * new colours.
 */
export const tone = {
    /** Warm empty cell — a quiet fill for inactive chips and counts. */
    sand: graphRamp[0],
    /** Pale lilac card. */
    lilac: graphRamp[1],
    /** Mid lilac card; dark ink text on it. */
    orchid: graphRamp[2],
    /** The lighter purple shape layered on the brand hero. */
    violet: graphRamp[3],
} as const;

/** Named by role, so call sites say what they mean rather than picking a number. */
export const radius = {
    field: 13,
    cta: 14,
    card: 18,
    panel: 22,
    pill: 999,
} as const;

export const space = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    gutter: 20,
} as const;

/**
 * Soft, cross-platform shadows as CSS-style `boxShadow` strings (RN 0.76+).
 *
 * The legacy `shadow*` props are iOS-only and Android renders `elevation` as a
 * hard Material shadow instead, so a screen built with them looks off-design on
 * half the devices. `scripts/forbid-native-shadows.mjs` enforces this.
 */
export const shadow = {
    /** Raised card / popover. */
    card: { boxShadow: '0 24px 60px -30px rgba(9, 9, 11, 0.12)' },
    /** Primary purple CTA. */
    cta: { boxShadow: '0 14px 28px -14px rgba(124, 58, 237, 0.75)' },
    /** The floating capture button. */
    fab: { boxShadow: '0 18px 34px -14px rgba(124, 58, 237, 0.7)' },
    /** The highlighted plan card. */
    feature: { boxShadow: '0 16px 34px -20px rgba(124, 58, 237, 0.55)' },
    /** Bottom sheet lifting off the page. */
    sheet: { boxShadow: '0 -20px 60px -20px rgba(23, 24, 31, 0.35)' },
    /** Selected segment in a segmented control. */
    segment: { boxShadow: '0 2px 6px -3px rgba(23, 24, 31, 0.25)' },
    /** A tile lifted off a colour block it overlaps — Home's action tiles. */
    lift: { boxShadow: '0 24px 50px -24px rgba(9, 9, 11, 0.28)' },
    /** The same lift for a dark tile, which needs more to read. */
    liftDark: { boxShadow: '0 24px 50px -24px rgba(9, 9, 11, 0.45)' },
    /** The floating tab bar. */
    bar: { boxShadow: '0 20px 40px -16px rgba(23, 24, 31, 0.55)' },
} as const;

/** Recoloured glow with the same geometry as the CTA shadow. */
export function glow(rgb: string, opacity = 0.7) {
    return { boxShadow: `0 14px 28px -14px rgba(${rgb}, ${opacity})` };
}

/** Scrim behind bottom sheets and modals. */
export const scrim = 'rgba(23, 24, 31, 0.52)';

/**
 * Phone chrome. The status bar and home indicator are real on device — never
 * drawn — so screens read the safe-area insets and add these on top.
 */
export const layout = {
    /** Breathing room below the status bar before a screen's first content. */
    headerTop: 24,
    /** Tab bar height above the home indicator. */
    tabBar: 64,
} as const;
