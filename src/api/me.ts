import { request } from './client';

/** GET /api/v1/me — who, which kitchen, what it allows. */
export type Me = {
    user: { id: string; email: string; name: string | null };
    workspace: { id: string; name: string; role: string };
    plan: {
        key: string;
        effective: 'starter' | 'solo' | 'pro' | 'locked';
        name: string;
        status: string;
        trialEndsAt: string | null;
        trialHoursRemaining: number | null;
        currentPeriodEnd: string | null;
    };
    /** `used` is null when the studio could not reach Zernio to count. */
    channels: { used: number | null; cap: number };
};

export const getMe = () => request<Me>('/me');

/** A first name to greet with: the name's first word, or the email's local part. */
export function firstName(me: Me | null): string | null {
    if (!me) return null;
    const fromName = me.user.name?.trim().split(/\s+/)[0];
    if (fromName) return fromName;
    const local = me.user.email.split('@')[0];
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : null;
}

export function initialOf(me: Me | null): string {
    return (firstName(me) ?? '?').charAt(0).toUpperCase();
}
