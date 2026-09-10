import { request } from './client';
import { relativeLabel, reminderLabel } from './format';

/**
 * Notes — the capture inbox.
 *
 * A note is a `board_items` row of type 'text' on the workspace's Library
 * board. The `remindAt` field is backed by a real column as of the studio's
 * migrations/20260910_board_item_remind_at.sql; before that it was the one
 * field in the fixtures with nothing behind it.
 *
 * The shape below is the fixture shape plus the raw instants: the screens were
 * typed against `createdLabel`/`remindLabel`, so keeping those means wiring is
 * a swap rather than a rewrite, while `remindAt` and `createdAt` are what
 * editing and sorting actually need.
 */

export type Note = {
    id: string;
    text: string;
    createdLabel: string;
    remindLabel?: string;
    /**
     * Set once the note has been turned into a post. Always undefined for now:
     * nothing records the link from a note to the post it became, and inventing
     * a value here would be a lie the UI renders as a "Draft" badge.
     */
    state?: 'draft' | 'posted';
    /** Raw values, for editing and for anything that needs to sort or compare. */
    createdAt: string;
    remindAt: string | null;
};

/** What `/api/v1/notes` actually returns. */
type NoteDto = {
    id: string;
    text: string;
    remindAt: string | null;
    createdAt: string;
    updatedAt: string;
};

function toNote(dto: NoteDto): Note {
    return {
        id: dto.id,
        text: dto.text,
        createdLabel: relativeLabel(dto.createdAt),
        remindLabel: reminderLabel(dto.remindAt),
        createdAt: dto.createdAt,
        remindAt: dto.remindAt,
    };
}

export async function listNotes(signal?: AbortSignal): Promise<Note[]> {
    const { notes } = await request<{ notes: NoteDto[] }>('/notes', { signal });
    return notes.map(toNote);
}

export async function createNote(input: { text: string; remindAt?: string | null }): Promise<Note> {
    const { note } = await request<{ note: NoteDto }>('/notes', {
        method: 'POST',
        body: { text: input.text, remindAt: input.remindAt ?? null },
    });
    return toNote(note);
}

export async function updateNote(
    id: string,
    patch: { text?: string; remindAt?: string | null },
): Promise<Note> {
    const { note } = await request<{ note: NoteDto }>(`/notes/${id}`, {
        method: 'PATCH',
        // Passed through as given: the endpoint distinguishes an absent
        // `remindAt` (leave it alone) from an explicit null (clear it).
        body: patch,
    });
    return toNote(note);
}

export async function deleteNote(id: string): Promise<void> {
    await request(`/notes/${id}`, { method: 'DELETE' });
}
