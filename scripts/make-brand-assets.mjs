/**
 * Renders the brand mark to the PNGs the native shells need.
 *
 * The launch screen, the home-screen icon and the favicon are all bitmaps —
 * neither iOS nor Android will run our SVG at boot — so they have to be baked.
 * Baking them from `src/theme/brand-mark.ts` rather than from an exported
 * artboard means the icon can never drift from the mark the app renders in JS:
 * Node strips the types and runs the same generator the app does.
 *
 *   node scripts/make-brand-assets.mjs
 *
 * Re-run it whenever the mark changes in the studio.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    BRAND_INDIGO,
    BRAND_ORANGE,
    SWIRL_ARM_BOTTOM,
    SWIRL_ARM_TOP,
    SWIRL_VIEWBOX,
    swirlStrokeFor,
} from '../src/theme/brand-mark.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const images = path.join(root, 'assets', 'images');

/** Page cream, from `tokens.ts`. The launch screen must match the first frame. */
const CREAM = '#fefaf6';

/**
 * @param {{ size: number, pad?: number, background?: string | null }} opts
 * `pad` is the share of the canvas left empty around the mark — icons need a
 * wide margin because iOS masks the corners, the splash needs none because the
 * canvas is the whole screen.
 */
function markSvg({ size, pad = 0, background = null }) {
    // The stroke is quoted against the viewBox, so ask for the weight at the
    // size the mark is actually drawn rather than at the canvas size.
    const drawn = size * (1 - pad * 2);
    const stroke = swirlStrokeFor(drawn);
    const inset = (SWIRL_VIEWBOX * pad) / (1 - pad * 2);
    const extent = SWIRL_VIEWBOX + inset * 2;
    const arms = [
        [SWIRL_ARM_TOP, BRAND_ORANGE],
        [SWIRL_ARM_BOTTOM, BRAND_INDIGO],
    ]
        .map(
            ([d, c]) =>
                `<path d="${d}" stroke="${c}" stroke-width="${stroke}" ` +
                `stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
        )
        .join('');
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
        `viewBox="${-inset} ${-inset} ${extent} ${extent}">` +
        (background ? `<rect x="${-inset}" y="${-inset}" width="${extent}" height="${extent}" fill="${background}"/>` : '') +
        arms +
        `</svg>`
    );
}

const TARGETS = [
    // Transparent: expo-splash-screen composites it over `backgroundColor`.
    { file: 'splash-icon.png', size: 1024, pad: 0.06 },
    { file: 'icon.png', size: 1024, pad: 0.17, background: CREAM },
    { file: 'favicon.png', size: 96, pad: 0.1, background: CREAM },
    // Android draws the foreground inside a mask that crops ~25% off each edge.
    { file: 'android-icon-foreground.png', size: 1024, pad: 0.28 },
    { file: 'android-icon-background.png', size: 1024, pad: 0.5, background: CREAM },
];

const sharp = (await import('sharp')).default;

await mkdir(images, { recursive: true });
for (const { file, size, pad, background } of TARGETS) {
    const svg = Buffer.from(markSvg({ size, pad, background }));
    await sharp(svg, { density: 384 }).png().toFile(path.join(images, file));
    console.log(`  ${file}  ${size}×${size}`);
}

/** Monochrome themed-icon slot: one flat colour, so the arms merge into ink. */
const mono = markSvg({ size: 1024, pad: 0.28 })
    .replaceAll(BRAND_ORANGE, '#000000')
    .replaceAll(BRAND_INDIGO, '#000000');
await sharp(Buffer.from(mono), { density: 384 })
    .png()
    .toFile(path.join(images, 'android-icon-monochrome.png'));
console.log('  android-icon-monochrome.png  1024×1024');

/** The lone SVG, for anything that can take vector (docs, the web build). */
await writeFile(path.join(images, 'mark.svg'), markSvg({ size: 200 }));
console.log('  mark.svg');
