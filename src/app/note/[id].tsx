import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, Gutter, IconButton, Screen } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { useNotes } from '@/api/useNotes';
import { jottedLabel, reminderDetail } from '@/api/format';
import { color, font, space, text, HIT } from '@/theme';

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

            {note.remindLabel ? (
                <Gutter style={{ paddingTop: 24 }}>
                    <Card padded={0}>
                        <View
                            style={{
                                minHeight: 62,
                                paddingHorizontal: 16,
                                paddingVertical: 15,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 13,
                            }}
                        >
                            <View
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 12,
                                    backgroundColor: color.brandTint,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Icon name="clock" size={19} tint={color.brand} weight={2.1} />
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={text.label}>{reminderDetail(note.remindAt)}</Text>
                                <Text style={[text.meta, { fontFamily: font.medium }]}>You’ll get a nudge</Text>
                            </View>
                            <Pressable style={{ minHeight: HIT, justifyContent: 'center', paddingHorizontal: 4 }}>
                                <Text style={[text.link, { fontSize: 13 }]}>Change</Text>
                            </Pressable>
                        </View>
                    </Card>
                </Gutter>
            ) : null}

        </Screen>
    );
}
