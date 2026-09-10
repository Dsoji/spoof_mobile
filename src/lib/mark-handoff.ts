import { useSyncExternalStore } from 'react';

/**
 * Has the splash finished handing its mark over?
 *
 * The destination screens draw a mark of their own, in the exact spot the
 * splash flies to. Both being visible at once is two logos on screen — the
 * arriving one and the one already parked at its destination — which is
 * precisely what the flight is meant to look like it is NOT doing.
 *
 * So the destination hides its mark until the splash says it has landed. It
 * hides with opacity rather than by not rendering: the mark still occupies its
 * space, so nothing beside it shifts when it appears.
 *
 * One-way and app-lifetime. Once handed over there is nothing to hand over
 * again — a later visit to welcome, after signing out, simply draws its mark.
 */

let landed = false;
const listeners = new Set<() => void>();

const snapshot = () => landed;

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function markLanded() {
    if (landed) return;
    landed = true;
    listeners.forEach((l) => l());
}

export function useMarkLanded(): boolean {
    return useSyncExternalStore(subscribe, snapshot, snapshot);
}
