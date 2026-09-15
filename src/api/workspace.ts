import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

import { peekToken, subscribeToSession } from './session';

/**
 * Which kitchen the app is acting on.
 *
 * A workspace owns everything — notes, channels, posts — and one person can
 * belong to several. The studio resolves an unqualified request to the user's
 * oldest workspace, so `null` here means "whatever that is", and the switcher
 * only has to store something once the user actually picks.
 *
 * Kept in SecureStore only because it is already a dependency and survives
 * restarts; the id is not a secret.
 */

const KEY = 'spoofkitchen.workspace';

let cached: string | null | undefined;
const listeners = new Set<() => void>();

export function subscribeToWorkspace(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function notify() {
    listeners.forEach((l) => l());
}

export function peekSelectedWorkspaceId(): string | null | undefined {
    return cached;
}

export async function getSelectedWorkspaceId(): Promise<string | null> {
    if (cached !== undefined) return cached;
    try {
        cached = await SecureStore.getItemAsync(KEY);
    } catch {
        cached = null;
    }
    return cached;
}

/** Pick a kitchen, or `null` to fall back to the default. */
export async function selectWorkspace(id: string | null): Promise<void> {
    if (cached === id) return;
    cached = id;
    try {
        if (id) await SecureStore.setItemAsync(KEY, id);
        else await SecureStore.deleteItemAsync(KEY);
    } catch {
        // The in-memory choice still applies for this session; it just will not
        // survive a restart.
    }
    notify();
}

export function useSelectedWorkspaceId(): string | null {
    const read = () => cached ?? null;
    return useSyncExternalStore(subscribeToWorkspace, read, read);
}

// Load early, so the first request after launch already knows the choice.
void getSelectedWorkspaceId().then(notify);

// A remembered kitchen belongs to the account that picked it. Left in place, the
// next person to sign in on this device would send an id they cannot access.
subscribeToSession(() => {
    if (!peekToken()) void selectWorkspace(null);
});
