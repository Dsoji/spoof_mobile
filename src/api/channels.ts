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

const PLAN_LABELS: Record<string, string> = {
    starter: 'Trial',
    solo: 'Solo',
    pro: 'Pro',
    locked: 'Expired',
};

export function planLabel(plan: string): string {
    return PLAN_LABELS[plan] ?? plan;
}
