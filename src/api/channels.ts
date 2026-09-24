import { request } from './client';

export type Channel = {
    id: string;
    platform: string;
    handle: string | null;
    name: string | null;
    profileUrl: string | null;
    active: boolean;
};

export type ChannelList = { channels: Channel[]; used: number; cap: number; plan: string };

export const listChannels = () => request<ChannelList>('/channels');

/**
 * The OAuth page for connecting `platform`. `redirectUrl` must use the app's
 * own scheme — the studio refuses anything else.
 */
export async function connectLink(platform: string, redirectUrl?: string): Promise<string> {
    const { url } = await request<{ url: string }>('/channels/connect', {
        method: 'POST',
        body: { platform, redirectUrl },
    });
    return url;
}

/**
 * The platforms this app offers, in the order it offers them. Keys are
 * Zernio's names; labels are what a person calls them.
 */
export const PLATFORMS = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'twitter', label: 'X' },
    { key: 'linkedin', label: 'LinkedIn' },
] as const;

export function platformLabel(key: string): string {
    return PLATFORMS.find((p) => p.key === key)?.label ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Each platform's own brand colour, for telling channels apart at a glance.
 *
 * Mirrored verbatim from the studio's PLATFORM_COLORS in
 * src/app/dashboard/components/AnalyticsTab.tsx — change it there first. Like
 * the Apple and Google marks in Icon.tsx these belong to the platforms, not to
 * our palette, which is why they live here and not in tokens.ts.
 */
const PLATFORM_COLORS: Record<string, string> = {
    instagram: '#E4405F',
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    linkedin: '#0077B5',
    youtube: '#FF0000',
    tiktok: '#000000',
    pinterest: '#E60023',
    threads: '#000000',
    bluesky: '#0085FF',
    reddit: '#FF4500',
};

/** A short mark for a platform inside its colour disc — letters, not the platform's logo. */
const MARKS: Record<string, string> = { instagram: 'Ig', tiktok: 'Tt', youtube: 'Yt', twitter: 'X', linkedin: 'in', facebook: 'f' };

export function platformMark(platform: string): string {
    return MARKS[platform.toLowerCase()] ?? platformLabel(platform).charAt(0);
}

/** A platform's brand colour, or null for one the studio has no colour for. */
export function platformColor(platform: string): string | null {
    return PLATFORM_COLORS[platform.toLowerCase()] ?? null;
}

/**
 * Caption ceilings, mirrored from the studio's src/lib/platform-limits.ts —
 * change them there first. X is the free tier's 280; Premium allows more, but
 * a free account silently overflowing is the worse failure.
 */
const CAPTION_LIMITS: Record<string, number> = {
    instagram: 2200,
    facebook: 63206,
    twitter: 280,
    linkedin: 3000,
    tiktok: 2200,
    youtube: 5000,
};

/** The studio's cap on the shared caption, and the fallback for a platform not in the table. */
export const DEFAULT_CAPTION_LIMIT = 2200;

export function captionLimit(platform: string): number {
    return CAPTION_LIMITS[platform.toLowerCase()] ?? DEFAULT_CAPTION_LIMIT;
}

const PLAN_LABELS: Record<string, string> = {
    starter: 'Trial',
    solo: 'Solo',
    pro: 'Pro',
    locked: 'Expired',
};

export function planLabel(plan: string): string {
    return PLAN_LABELS[plan] ?? plan;
}
