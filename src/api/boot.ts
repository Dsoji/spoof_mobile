import { useSyncExternalStore } from 'react';

import { getToken, peekToken, subscribeToSession } from './session';
import { getSelectedWorkspaceId, subscribeToWorkspace } from './workspace';
import { refreshNotes } from './useNotes';
import { activityResource, channelsResource, kitchensResource, meResource, recentPostsResource } from './resources';

/**
 * The launch service: fetch what the first screens need, before they ask.
 *
 * Without it every request waits for a screen to mount, so the tabs open onto
 * spinners and the You tab's kitchen line fills in last. Priming happens on
 * launch with a stored session, on sign-in, and on a kitchen switch — the same
 * stores the screens read, so there is nothing to hand over.
 *
 * The splash waits on the launch prime, but only briefly: a slow studio must
 * not hold the app closed. Anything still in flight when the splash lifts
 * shows its own loading state as before.
 */

/** Longest the splash will wait on the network. */
const LAUNCH_WAIT_MS = 2500;

/** Everything that belongs to the selected kitchen and is on a first screen. */
function primeKitchen(): Promise<unknown> {
    return Promise.allSettled([meResource.refresh(), channelsResource.refresh(), recentPostsResource.refresh(), refreshNotes()]);
}

/** Everything. The kitchen list and the activity graph belong to the person. */
function primeAll(): Promise<unknown> {
    return Promise.allSettled([kitchensResource.refresh(), activityResource.refresh(), primeKitchen()]);
}

let launchSettled = false;
const listeners = new Set<() => void>();

function settleLaunch() {
    if (launchSettled) return;
    launchSettled = true;
    listeners.forEach((l) => l());
}

async function launch() {
    // The kitchen id is read before any request, so the first ones already
    // carry it — see getSelectedWorkspaceId.
    const [token] = await Promise.all([getToken(), getSelectedWorkspaceId()]);
    if (!token) return settleLaunch();
    await Promise.race([primeAll(), new Promise((resolve) => setTimeout(resolve, LAUNCH_WAIT_MS))]);
    settleLaunch();
}

void launch();

// Signing in. A sign-out also lands here and has nothing to fetch.
subscribeToSession(() => {
    if (peekToken()) void primeAll();
});

// Switching kitchens. Registered after the stores' own reset listeners —
// importing ./resources creates them first — so this refetches into the
// cleared stores rather than being discarded by their reset.
subscribeToWorkspace(() => {
    if (peekToken()) void primeKitchen();
});

/** True once the launch prime has landed or given up; the splash waits on it. */
export function useLaunchSettled(): boolean {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => launchSettled,
        () => launchSettled,
    );
}
