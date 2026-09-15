import { request } from './client';
import { deviceTimeZone } from './calendar';

export type ActivityDay = { date: string; count: number; score: number; level: 0 | 1 | 2 | 3 | 4 };

export type Activity = {
    tz: string;
    /** A year of days, oldest first, ending today. */
    days: ActivityDay[];
    streak: number;
    best: number;
    stats: { notesJotted: number; postsPublished: number; notesShippedRatio: number | null };
};

export const getActivity = () => request<Activity>(`/activity?tz=${encodeURIComponent(deviceTimeZone())}`);

/** Monday = 0, matching the Monday-first graph and calendar. Zone-independent for a calendar date. */
export function weekdayIndex(date: string): number {
    return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}
