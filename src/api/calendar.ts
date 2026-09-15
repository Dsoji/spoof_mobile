import { request } from './client';

export type CalendarItem =
    | { kind: 'reminder'; at: string; startsAt: string; text: string; noteId: string }
    | { kind: 'idea'; at: string; startsAt: string; text: string; ideaId: string }
    | { kind: 'post'; at: string; startsAt: string; text: string; platforms: string[]; postId: string };

export type CalendarDay = { date: string; items: CalendarItem[] };

export type CalendarRange = {
    days: CalendarDay[];
    tz: string;
    /** Sources the studio could not reach this time — today, only ever 'posts'. */
    unavailable: string[];
};

/**
 * The device's IANA timezone. The studio groups items into days by it, so a
 * reminder at 23:30 lands on the day the user sees it on, not the day it is in
 * UTC.
 */
export function deviceTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export const getCalendar = (from: string, to: string) =>
    request<CalendarRange>(
        `/calendar?from=${from}&to=${to}&tz=${encodeURIComponent(deviceTimeZone())}`,
    );

/** YYYY-MM-DD of a local Date. Not toISOString, which is UTC and shifts the day near midnight. */
export function ymd(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
