import { useCallback, useEffect, useSyncExternalStore } from 'react';

import * as api from './notes';
import { subscribeToSession, peekToken } from './session';
import type { Note } from './notes';

/**
 * One copy of the notes list, shared by every screen that shows notes.
 *
 * Home, the Notes tab and a note's detail screen all read the same collection,
 * and capture writes to it from a modal that closes immediately afterwards. Per
 * screen `useState` would mean four independent fetches and a Notes tab that
 * still shows yesterday's list after you jot something — so the list lives in a
 * module-level store and the screens subscribe.
 *
 * Deliberately hand-rolled rather than a query library: this is one collection
 * with four operations, and the app ships no state dependency today.
 */

type State = {
    notes: Note[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
};

let state: State = { notes: [], status: 'idle' };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

const snapshot = () => state;

/** In-flight guard: two screens mounting at once should share one request. */
let inFlight: Promise<void> | null = null;

export function refreshNotes(): Promise<void> {
    if (inFlight) return inFlight;

    // Only the first load shows a spinner. A pull-to-refresh or a
    // refetch-after-write keeps the current list on screen instead of blanking
    // it, which is what makes the list stop flickering on every write.
    if (state.status === 'idle') set({ status: 'loading' });

    inFlight = api
        .listNotes()
        .then((notes) => set({ notes, status: 'ready', error: undefined }))
        .catch((e: unknown) => {
            set({ status: 'error', error: e instanceof Error ? e.message : 'Could not load your notes.' });
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
}

/**
 * Drop everything the store holds, on sign-out.
 *
 * The store is module-level, so it outlives the screens that read it — a JS
 * module is not reloaded when the user is sent back to `/welcome`. Without
 * this, the next account to sign in on the device sees the previous one's
 * notes until the first fetch lands.
 */
export function resetNotes() {
    inFlight = null;
    set({ notes: [], status: 'idle', error: undefined });
}

/**
 * Clear the store whenever the session ends, however it ends.
 *
 * you.tsx calls resetNotes() on a deliberate sign-out, but a session can also
 * end underneath the user when a token expires — client.ts drops it on a 401.
 * Subscribing here covers both, so one account's notes can never survive into
 * another's session on a shared device.
 */
subscribeToSession(() => {
    if (!peekToken() && state.status !== 'idle') resetNotes();
});

export function useNotes() {
    const current = useSyncExternalStore(subscribe, snapshot, snapshot);

    useEffect(() => {
        if (state.status === 'idle') void refreshNotes();
    }, []);

    /**
     * Writes go to the server first, then update the store with what came back.
     *
     * No optimistic insert: a note needs the server's id before its detail
     * screen can open or it can be edited, and a temporary local id that gets
     * swapped underneath is a race the app is too small to be worth running.
     */
    const create = useCallback(async (input: { text: string; remindAt?: string | null }) => {
        const note = await api.createNote(input);
        set({ notes: [note, ...state.notes], status: 'ready', error: undefined });
        return note;
    }, []);

    const update = useCallback(async (id: string, patch: { text?: string; remindAt?: string | null }) => {
        const note = await api.updateNote(id, patch);
        set({ notes: state.notes.map((n) => (n.id === id ? note : n)) });
        return note;
    }, []);

    const remove = useCallback(async (id: string) => {
        await api.deleteNote(id);
        set({ notes: state.notes.filter((n) => n.id !== id) });
    }, []);

    return {
        notes: current.notes,
        status: current.status,
        error: current.error,
        refresh: refreshNotes,
        create,
        update,
        remove,
    };
}

export type { Note };
