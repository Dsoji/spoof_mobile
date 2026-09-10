/**
 * Text presets.
 *
 * Two differences from the CSS these were lifted from, both forced by RN:
 * `lineHeight` is absolute points rather than a unitless multiple, and
 * `letterSpacing` is points rather than em — so `0.18em` at 10px is 1.8 here.
 */

import type { TextStyle } from 'react-native';

import { color } from './tokens';
import { font } from './fonts';

export const text = {
    /** Small caps label above a section or screen title. */
    eyebrow: {
        fontFamily: font.extrabold,
        fontSize: 10,
        lineHeight: 12,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: color.subtle,
    },
    /** The onboarding flow's orange step label. */
    eyebrowStep: {
        fontFamily: font.extrabold,
        fontSize: 11.5,
        lineHeight: 12,
        letterSpacing: 1.6,
        color: color.accent,
    },

    /** Editorial headlines. Serif, tight leading — never for UI labels. */
    displayXl: { fontFamily: font.serif, fontSize: 44, lineHeight: 50, color: color.ink },
    displayLg: { fontFamily: font.serif, fontSize: 34, lineHeight: 40, color: color.ink },
    display: { fontFamily: font.serif, fontSize: 32, lineHeight: 38, color: color.ink },
    displaySm: { fontFamily: font.serif, fontSize: 26, lineHeight: 31, color: color.ink },

    /** Row and card titles. */
    title: { fontFamily: font.extrabold, fontSize: 17, lineHeight: 21, color: color.ink },
    label: { fontFamily: font.extrabold, fontSize: 14.5, lineHeight: 18, color: color.ink },

    /** Note and caption text — the thing people actually read. */
    body: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.ink },
    bodyLg: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: color.muted },
    bodySm: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.ink },

    /** Timestamps, counts, helper lines. */
    meta: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: color.subtle },
    micro: { fontFamily: font.medium, fontSize: 11, lineHeight: 17, color: color.inactiveFg },

    /** Button faces. */
    cta: { fontFamily: font.extrabold, fontSize: 16, lineHeight: 20, color: color.white },
    ctaSm: { fontFamily: font.extrabold, fontSize: 15, lineHeight: 19, color: color.white },

    /** Pill / chip / badge faces. */
    badge: { fontFamily: font.extrabold, fontSize: 10.5, lineHeight: 14, color: color.brand },
    link: { fontFamily: font.extrabold, fontSize: 14, lineHeight: 18, color: color.brand },
} satisfies Record<string, TextStyle>;

/**
 * Minimum touch target. Anything a finger lands on is at least this tall —
 * the design review caught several 34–40px controls that had to grow.
 */
export const HIT = 44;
