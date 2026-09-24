import { space } from './tokens';

/**
 * Where the brand mark comes to rest, per destination.
 *
 * Shared, rather than written twice, because the splash hand-off animates its
 * mark to exactly this spot and then crossfades onto the real one. If the two
 * disagree by even a few points the mark visibly jumps at the handover — and
 * the way that breaks is silent: someone nudges a screen's padding, the
 * transition still runs, it just stops landing. Import these on both sides so
 * that cannot happen.
 *
 * `markTop` is an offset from the top of the screen's scroll content, and the
 * mark is pinned to it rather than vertically centred against its neighbours.
 * Centring would make the landing spot depend on how tall the text beside it
 * renders — which changes with the user's type size, and would put the target
 * somewhere this file cannot predict.
 */
export const HANDOFF = {
    /** First launch: the mark leads the hero, large. */
    welcome: {
        markSize: 62,
        /** Welcome's gutter is wider than the standard one. */
        gutter: 28,
        markTop: 52,
        /** The white disc behind the mark on welcome's purple hero reaches this far past it on every side. */
        discPad: 9,
    },
    /**
     * Returning: small, beside the greeting in the home header. Offset to sit
     * optically centred against that two-line block — eyebrow (12) + gap (5) +
     * greeting (36) is 53 tall, so (53 - 34) / 2 ≈ 10.
     */
    home: {
        markSize: 34,
        gutter: space.gutter,
        markTop: 10,
        /** The white disc behind the mark on the purple hero reaches this far past it on every side. */
        discPad: 7,
    },
} as const;
