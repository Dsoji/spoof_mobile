#!/usr/bin/env node
/**
 * Guard: forbid platform-split shadows.
 *
 * WHY: React Native's legacy `shadow*` props are iOS-only; Android renders ONLY
 * the `elevation` number as a hard, dark Material shadow — so a screen using
 * them looks right on iOS and crude on Android. The single source of soft,
 * cross-platform shadow is `boxShadow` (RN 0.76+), exposed through the theme as
 * `shadow.card`, `shadow.cta`, `shadow.fab`, … and `glow(rgb, opacity)`.
 *
 * Escape hatch for a genuine native-elevation need: put `// allow-native-shadow`
 * on the same line.
 *
 * Run: `npm run check:shadows` (also wired into `npm run typecheck`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['src'];
const EXTS = new Set(['.ts', '.tsx']);
// Matched only as object properties (`key:`) so prose in comments is safe.
const BANNED = /\b(shadowColor|shadowOpacity|shadowRadius|shadowOffset|elevation)\s*:/;
const ALLOW = /\/\/\s*allow-native-shadow/;

function walk(dir) {
    const out = [];
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return out;
    }
    for (const name of entries) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else if (EXTS.has(name.slice(name.lastIndexOf('.')))) out.push(full);
    }
    return out;
}

const offenders = [];
for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
        readFileSync(file, 'utf8')
            .split('\n')
            .forEach((line, i) => {
                if (BANNED.test(line) && !ALLOW.test(line)) {
                    offenders.push(`${relative(ROOT, file)}:${i + 1}  ${line.trim()}`);
                }
            });
    }
}

if (offenders.length) {
    console.error('Native shadow props found — use the theme’s boxShadow tokens instead:\n');
    offenders.forEach((o) => console.error('  ' + o));
    console.error('\n(See src/theme/tokens.ts → `shadow`. Escape hatch: // allow-native-shadow)');
    process.exit(1);
}
console.log('shadows ok');
