/**
 * Where the brand mark sits on the welcome screen.
 *
 * Shared, rather than written twice, because the splash hand-off animates its
 * mark to exactly this spot and then crossfades onto the real one. If the two
 * disagree by even a few points the mark visibly jumps at the handover — and
 * the way that breaks is silent: someone nudges the welcome screen's padding,
 * the transition still runs, it just stops landing. Import these on both sides
 * so that cannot happen.
 */
export const HANDOFF = {
    /** SwirlMark size on welcome. */
    markSize: 62,
    /** Welcome's horizontal gutter — wider than the standard one. */
    gutter: 28,
    /** Gap between the top of welcome's scroll content and the mark. */
    markTop: 52,
} as const;
