/**
 * The swirl mark's geometry, mirrored from the studio.
 *
 * Source of truth: `content_kitchen/src/lib/brand-mark.ts`. This is a verbatim
 * port — same viewBox, same radii, same sweep, same step count — because the
 * mark is generated, not drawn, and two generators that merely look alike
 * drift. When the curve changes there, re-copy this file.
 *
 * The colours are the one exception to "colours come from `tokens.ts`":
 * `BRAND_ORANGE` and `BRAND_INDIGO` are not in the studio's `globals.css`
 * @theme block either. They belong to the mark rather than to the palette —
 * note that the orange here (#ea580c) is a full step darker than the theme's
 * `accent` (#f97316), which is why the mark must not be recoloured from tokens.
 */

export const SWIRL_VIEWBOX = 200;
export const SWIRL_CENTER = 100;

const R_OUTER = 78;
const R_INNER = 14;
const SWEEP = 280;
const STEPS = 96;

/**
 * One arm, as a polyline sampled off a spiral.
 *
 * The radius eases from outer to inner on a smoothstep rather than linearly,
 * so the windings crowd toward the centre the way a whisk's do instead of
 * stepping down at a constant pitch.
 */
function spiralPath(startAngleDeg: number): string {
    let d = '';
    for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const rt = t * t * (3 - 2 * t);
        const r = R_OUTER + (R_INNER - R_OUTER) * rt;
        const ang = ((startAngleDeg - t * SWEEP) * Math.PI) / 180;
        const x = SWIRL_CENTER + r * Math.cos(ang);
        const y = SWIRL_CENTER - r * Math.sin(ang);
        d += (i === 0 ? 'M ' : ' L ') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d;
}

/** Two arms, half a turn apart — this is what makes it read as a swirl. */
export const SWIRL_ARM_TOP = spiralPath(90);
export const SWIRL_ARM_BOTTOM = spiralPath(270);

export const BRAND_ORANGE = '#ea580c';
export const BRAND_INDIGO = '#4f46e5';

/**
 * Stroke weight against the 200-unit viewBox, so the mark thickens as it
 * shrinks. A single scaled weight either disappears at 16pt or turns the
 * 96pt mark into a solid disc.
 */
export function swirlStrokeFor(size: number): number {
    if (size < 24) return 32;
    if (size < 80) return 24;
    return 22;
}
