import { useEffect, useSyncExternalStore } from 'react';

import { peekToken, subscribeToSession } from './session';
import { subscribeToWorkspace } from './workspace';

/**
 * One fetched value, shared by every screen that reads it.
 *
 * useNotes established the pattern for notes; this is the same thing made
 * generic, so `me`, channels, posts, the calendar and the activity graph do not
 * each hand-roll a copy.
 *
 * Every resource declares a scope. A 'workspace' resource belongs to the
 * selected kitchen and is dropped and refetched when the user switches; a
 * 'user' resource belongs to the person and survives a switch. Both are dropped
 * when the session ends.
 */

export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error';
export type ResourceState<T> = { data: T | null; status: ResourceStatus; error?: string };

export type Resource<T> = {
    getState: () => ResourceState<T>;
    subscribe: (listener: () => void) => () => void;
    refresh: () => Promise<void>;
    reset: () => void;
    /** Update the cached value in place, after a write whose result is already known. */
    mutate: (update: (data: T | null) => T | null) => void;
};

export function createResource<T>(
    fetcher: () => Promise<T>,
    { scope }: { scope: 'user' | 'workspace' },
): Resource<T> {
    let state: ResourceState<T> = { data: null, status: 'idle' };
    let inFlight: Promise<void> | null = null;

    /**
     * Bumped on every reset. A request records the generation it started in
     * and discards its result if that has moved on — otherwise a slow response
     * for kitchen A that lands after switching to B paints B's screen with A's
     * data, and nothing on screen says so.
     */
    let generation = 0;

    const listeners = new Set<() => void>();
    const set = (next: Partial<ResourceState<T>>) => {
        state = { ...state, ...next };
        listeners.forEach((l) => l());
    };

    const refresh = (): Promise<void> => {
        if (inFlight) return inFlight;
        const started = generation;

        // Only a cold load shows a spinner; a refresh keeps what is on screen.
        if (state.data === null) set({ status: 'loading', error: undefined });

        const request = fetcher()
            .then((data) => {
                if (started === generation) set({ data, status: 'ready', error: undefined });
            })
            .catch((e: unknown) => {
                if (started === generation) {
                    set({ status: 'error', error: e instanceof Error ? e.message : 'Something went wrong.' });
                }
            })
            .finally(() => {
                if (inFlight === request) inFlight = null;
            });

        inFlight = request;
        return request;
    };

    const reset = () => {
        generation++;
        inFlight = null;
        set({ data: null, status: 'idle', error: undefined });
    };

    subscribeToSession(() => {
        if (!peekToken()) reset();
    });

    if (scope === 'workspace') {
        subscribeToWorkspace(() => {
            reset();
            // Refetch only for a screen that is actually showing this, and only
            // while signed in — signing out also clears the kitchen, and a
            // fetch fired then would park the resource in an error state that
            // the next sign-in would not clear.
            if (listeners.size > 0 && peekToken()) void refresh();
        });
    }

    return {
        getState: () => state,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        refresh,
        reset,
        mutate: (update) => set({ data: update(state.data) }),
    };
}

/** Resources keyed by a string — one per calendar month, say. */
export function createResourceFamily<T>(
    fetcher: (key: string) => Promise<T>,
    options: { scope: 'user' | 'workspace' },
) {
    const cache = new Map<string, Resource<T>>();
    return {
        get(key: string): Resource<T> {
            let resource = cache.get(key);
            if (!resource) {
                resource = createResource(() => fetcher(key), options);
                cache.set(key, resource);
            }
            return resource;
        },
        /** Refetch every member that has been loaded, after a write that could touch any of them. */
        refreshLoaded() {
            cache.forEach((r) => {
                if (r.getState().status !== 'idle') void r.refresh();
            });
        },
    };
}

export function useResource<T>(resource: Resource<T>) {
    const state = useSyncExternalStore(resource.subscribe, resource.getState, resource.getState);

    useEffect(() => {
        if (resource.getState().status === 'idle') void resource.refresh();
    }, [resource]);

    return { ...state, refresh: resource.refresh };
}
