/**
 * ISO timestamps → the short labels the screens were built against.
 *
 * The fixtures carried `createdLabel: '2m ago'` and `remindLabel: 'Fri, 8:00'`
 * as literal strings, so the API returning ISO instants means the formatting
 * has to happen somewhere. It happens here rather than server-side because
 * "Yesterday" depends on the reader's clock and timezone, which the server does
 * not know — a note written at 23:50 is "Yesterday" to its author an hour later
 * and "today" to a server running UTC.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Midnight-to-midnight difference, which is what "yesterday" actually means. */
function calendarDaysBetween(a: Date, b: Date): number {
    const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((startB - startA) / DAY);
}

function hhmm(d: Date): string {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "just now" · "2m ago" · "3h ago" · "Yesterday" · "2d ago" · "12 Aug" */
export function relativeLabel(iso: string, now = new Date()): string {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return '';

    const elapsed = now.getTime() - at.getTime();
    if (elapsed < MINUTE) return 'just now';
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;

    const days = calendarDaysBetween(at, now);
    if (days === 0) return `${Math.floor(elapsed / HOUR)}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    return `${at.getDate()} ${at.toLocaleString(undefined, { month: 'short' })}`;
}

/** "Today, 8:00" · "Tomorrow, 8:00" · "Fri, 8:00" · "12 Aug, 8:00" */
export function reminderLabel(iso: string | null, now = new Date()): string | undefined {
    if (!iso) return undefined;
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return undefined;

    const days = calendarDaysBetween(now, at);
    const time = hhmm(at);

    if (days === 0) return `Today, ${time}`;
    if (days === 1) return `Tomorrow, ${time}`;
    // Beyond a week out a weekday name is ambiguous — "Fri" could be any Friday.
    if (days > 1 && days < 7) return `${DAYS[at.getDay()]}, ${time}`;
    if (days === -1) return `Yesterday, ${time}`;
    if (days < 0) return `Overdue · ${at.getDate()} ${at.toLocaleString(undefined, { month: 'short' })}`;

    return `${at.getDate()} ${at.toLocaleString(undefined, { month: 'short' })}, ${time}`;
}

/** "Friday, 11 Sep · 8:00" — the long form, for a note's own screen. */
export function reminderDetail(iso: string | null): string | undefined {
    if (!iso) return undefined;
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return undefined;

    const weekday = at.toLocaleString(undefined, { weekday: 'long' });
    const month = at.toLocaleString(undefined, { month: 'short' });
    return `${weekday}, ${at.getDate()} ${month} · ${hhmm(at)}`;
}

/** "Jotted a few minutes ago" · "Jotted yesterday" — the detail screen's byline. */
export function jottedLabel(iso: string, now = new Date()): string {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return 'Jotted';

    const elapsed = now.getTime() - at.getTime();
    if (elapsed < 5 * MINUTE) return 'Jotted a few minutes ago';

    const days = calendarDaysBetween(at, now);
    if (days === 0) return `Jotted ${elapsed < HOUR ? `${Math.floor(elapsed / MINUTE)} minutes` : `${Math.floor(elapsed / HOUR)} hours`} ago`;
    if (days === 1) return 'Jotted yesterday';
    if (days < 7) return `Jotted ${days} days ago`;
    return `Jotted ${at.getDate()} ${at.toLocaleString(undefined, { month: 'short' })}`;
}

/**
 * The capture screen's reminder presets, resolved against the reader's clock.
 *
 * Resolved on the client, not the server, for the same reason the labels are:
 * "this weekend" is a fact about where the user is, and a server in UTC would
 * put a Saturday-morning nudge on Friday night for anyone west of it.
 */
export function presetToIso(preset: string, now = new Date()): string | null {
    const at = new Date(now);

    switch (preset) {
        case 'Later today': {
            // 18:00, unless that has already passed — in which case three hours
            // from now, so "later today" is never a reminder in the past.
            at.setHours(18, 0, 0, 0);
            if (at.getTime() <= now.getTime()) {
                at.setTime(now.getTime() + 3 * HOUR);
            }
            return at.toISOString();
        }
        case 'Tomorrow, 8:00': {
            at.setDate(at.getDate() + 1);
            at.setHours(8, 0, 0, 0);
            return at.toISOString();
        }
        case 'This weekend': {
            // The coming Saturday at 10:00. On a Saturday or Sunday that means
            // next weekend, not the one currently happening.
            const daysToSaturday = ((6 - at.getDay() + 7) % 7) || 7;
            at.setDate(at.getDate() + daysToSaturday);
            at.setHours(10, 0, 0, 0);
            return at.toISOString();
        }
        default:
            return null;
    }
}

/** "Thursday, 10 Sep" — the eyebrow above each tab's title. */
export function todayEyebrow(now = new Date()): string {
    return `${now.toLocaleString(undefined, { weekday: 'long' })}, ${now.getDate()} ${now.toLocaleString(undefined, { month: 'short' })}`;
}

/** Morning before noon, afternoon before six, evening after. */
export function greeting(now = new Date()): string {
    const h = now.getHours();
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
}
