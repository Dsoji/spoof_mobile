import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, Gutter, IconButton, Screen } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { isPast, WhenPicker } from '@/components/WhenPicker';
import { useNotes, type Note } from '@/api/useNotes';
import { jottedLabel, presetToIso, reminderDetail } from '@/api/format';
import { color, font, text, HIT } from '@/theme';

export default function NoteDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { notes, status, error, refresh, remove } = useNotes();
    const [deleting, setDeleting] = useState(false);
    const note = notes.find((n) => n.id === id);

    const onDelete = () => {
        // `deleting` greys the icon, but the guard is what stops a second tap
        // stacking a second confirm dialog on top of the first.
        if (!note || deleting) return;
        // Deleting is the one destructive thing on this screen and there is no
        // undo behind it, so it asks first.
        Alert.alert('Delete this note?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setDeleting(true);
                    try {
                        await remove(note.id);
                        router.back();
                    } catch (e) {
                        setDeleting(false);
                        toast(e instanceof Error ? e.message : 'Could not delete that note.');
                    }
                },
            },
        ]);
    };

    // The list may not have loaded yet — this screen is reachable from a deep
    // link, not only from a tap on a note that was already on screen.
    if (!note) {
        return (
            <Screen>
                <Gutter>
                    <IconButton name="chevronLeft" onPress={() => router.back()} />
                </Gutter>
                <Gutter style={{ paddingTop: 40 }}>
                    {status === 'loading' || status === 'idle' ? <Loading /> : null}
                    {status === 'error' ? <Failed message={error} onRetry={refresh} /> : null}
                    {status === 'ready' ? (
                        <Empty icon="file" title="Note not found" body="It may have been deleted." />
                    ) : null}
                </Gutter>
            </Screen>
        );
    }

    return (
        <Screen
            scroll
            footer={
                <Button
                    label="Turn into a post"
                    icon="sparkle"
                    onPress={() =>
                        router.push({
                            pathname: '/compose',
                            params: { text: note.text, noteId: note.id, noteCreatedAt: note.createdAt },
                        })
                    }
                />
            }
        >
            <Gutter style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />
                <IconButton
                    name="trash"
                    tint={deleting ? color.inactiveFg : color.danger}
                    onPress={deleting ? undefined : onDelete}
                />
            </Gutter>

            <Gutter style={{ paddingTop: 30, gap: 12 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 22, lineHeight: 31, color: color.ink }}>
                    {note.text}
                </Text>
                <Text style={[text.meta, { fontFamily: font.semibold }]}>{jottedLabel(note.createdAt)}</Text>
            </Gutter>

            <Reminder note={note} />

        </Screen>
    );
}

/**
 * The note's reminder: when it fires, and changing or removing it.
 *
 * Always rendered, unlike the read-only card this replaced — that one appeared
 * only when a reminder already existed, so a note jotted without one could
 * never be given one afterwards. The card states "No reminder" instead.
 *
 * Same shape as rescheduling a post (`post/[id].tsx`): the picker expands in
 * place rather than pushing a screen, so the thing being changed stays visible
 * above it.
 */
function Reminder({ note }: { note: Note }) {
    const { update } = useNotes();
    const suggested = presetToIso('Tomorrow, 8:00');
    // Where the picker starts: the note's own time, or the capture sheet's
    // default, which is the one suggestion the user has already seen.
    const current = note.remindAt ? new Date(note.remindAt) : suggested ? new Date(suggested) : new Date();

    const [open, setOpen] = useState(false);
    const [when, setWhen] = useState(current);
    const [busy, setBusy] = useState<'saving' | 'clearing' | null>(null);

    const set = note.remindAt !== null;

    const onSave = async () => {
        if (busy) return;
        // The server would take a past instant and the cron would fire it on
        // the next sweep, which reads as a reminder arriving the moment you set
        // it. Catch it here, where there is somewhere to say so.
        if (isPast(when)) {
            toast('That time has already passed. Pick a time in the future.');
            return;
        }
        setBusy('saving');
        try {
            await update(note.id, { remindAt: when.toISOString() });
            setOpen(false);
            toast(set ? 'Reminder moved.' : 'Reminder set.', 'success');
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not save that reminder.');
        } finally {
            setBusy(null);
        }
    };

    const onClear = async () => {
        if (busy) return;
        setBusy('clearing');
        try {
            // An explicit null, which the endpoint reads as "clear it".
            // Omitting the field would leave the reminder exactly where it is.
            await update(note.id, { remindAt: null });
            setOpen(false);
            toast('Reminder removed.', 'success');
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not remove that reminder.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <Gutter style={{ paddingTop: 24 }}>
            <Card padded={0}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 15, gap: 14 }}>
                    <View style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                        <View
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                backgroundColor: set ? color.brandTint : color.field,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Icon name="clock" size={19} tint={set ? color.brand : color.inactiveFg} weight={2.1} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={text.label}>{reminderDetail(note.remindAt) ?? 'No reminder'}</Text>
                            <Text style={[text.meta, { fontFamily: font.medium }]}>
                                {set ? 'You’ll get a nudge' : 'Set one and we’ll nudge you'}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => {
                                setWhen(current);
                                setOpen(!open);
                            }}
                            accessibilityRole="button"
                            style={{ minHeight: HIT, justifyContent: 'center', paddingHorizontal: 4 }}
                        >
                            <Text style={[text.link, { fontSize: 13 }]}>
                                {open ? 'Cancel' : set ? 'Change' : 'Set'}
                            </Text>
                        </Pressable>
                    </View>
                    {open ? (
                        <>
                            <WhenPicker value={when} onChange={setWhen} />
                            <Button
                                label={set ? 'Save new time' : 'Set reminder'}
                                height={48}
                                loading={busy === 'saving'}
                                disabled={busy === 'clearing'}
                                onPress={onSave}
                            />
                            {set ? (
                                <Button
                                    label="Remove reminder"
                                    variant="secondary"
                                    height={48}
                                    loading={busy === 'clearing'}
                                    disabled={busy === 'saving'}
                                    onPress={onClear}
                                />
                            ) : null}
                        </>
                    ) : null}
                </View>
            </Card>
        </Gutter>
    );
}
