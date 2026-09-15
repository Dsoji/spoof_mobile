import { request } from './client';

/** GET /api/v1/workspaces — one entry per kitchen the user belongs to. */
export type Kitchen = {
    id: string;
    name: string;
    role: string;
    plan: 'starter' | 'solo' | 'pro' | 'locked';
    planName: string;
    /** The kitchen an unqualified request resolves to. */
    isDefault: boolean;
};

export async function listKitchens(): Promise<Kitchen[]> {
    const { workspaces } = await request<{ workspaces: Kitchen[] }>('/workspaces');
    return workspaces;
}
