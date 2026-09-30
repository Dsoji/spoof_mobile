import { useState } from 'react';
import { router } from 'expo-router';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Card, Gutter } from '@/components/ui';
import { toast } from '@/components/Toast';
import { isPast, WhenPicker } from '@/components/WhenPicker';
import { useNotes } from '@/api/useNotes';
import { presetToIso } from '@/api/format';
import { color, font, layout, radius, space, text, HIT } from '@/theme';

const PRESETS = ['Later today', 'Tomorrow, 8:00', 'This weekend'];

/**
 * When to nudge: one of the presets, a moment picked by hand, or not at all.
 *
 * A preset is held as its label rather than as an instant because "Later today"
 * resolves differently at 17:00 than it did at 09:00 — resolving it on save,
 * not on tap, is what keeps a note left open on screen from being saved with a
 * stale time.
 */
type Remind = { kind: 'preset'; label: string } | { kind: 'at'; date: Date } | null;

function remindToIso(remind: Remind): string | null {
    if (!remind) return null;
    return remind.kind === 'preset' ? presetToIso(remind.label) : remind.date.toISOString();
}

/** A hand-picked moment, short enough to sit in a chip beside the presets. */
function pickedLabel(date: Date): string {
    return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Jot a note.
 *
 * The note is a `board_items` row of type 'text' — `{ text }` plus, since the
 * studio's 20260910 migration, a nullable `remind_at`. The presets resolve to a
 * real instant on this side of the wire; see presetToIso.
 *
 * Three presets and "Pick a date", which are mutually exclusive: one reminder,
 * reached two ways. Tapping the selected preset again clears it, so "no
 * reminder" needs no chip of its own.
 */
export default function Capture() {
    const insets = useSafeAreaInsets();
    const [body, setBody] = useState('');
    const [remind, setRemind] = useState<Remind>({ kind: 'preset', label: 'Tomorrow, 8:00' });
    const [picking, setPicking] = useState(false);
    const [saving, setSaving] = useState(false);
    const { create } = useNotes();

    const canSave = body.trim().length > 0 && !saving;
    const custom = remind?.kind === 'at';

    const onSave = async () => {
        if (!canSave) return;
        // Only a hand-picked time can be in the past; the presets resolve
        // forward by construction.
        if (remind?.kind === 'at' && isPast(remind.date)) {
            toast('That time has already passed. Pick a time in the future.');
            return;
        }
        setSaving(true);
        try {
            await create({ text: body.trim(), remindAt: remindToIso(remind) });
            router.back();
        } catch (e) {
            // Stay on the screen with the text intact — losing what someone
            // just typed because the network blinked is the one unforgivable
            // failure for a capture inbox.
            setSaving(false);
            toast(e instanceof Error ? e.message : 'Could not save that note.');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, backgroundColor: color.cream }}
        >
            <View style={{ flex: 1, paddingTop: insets.top + layout.headerTop }}>
                <Gutter style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Pressable
                        onPress={() => router.back()}
                        style={{ minHeight: HIT, justifyContent: 'center' }}
                    >
                        <Text style={{ fontFamily: font.bold, fontSize: 15, color: color.muted }}>Cancel</Text>
                    </Pressable>
                    <Text style={[text.eyebrow, { fontSize: 12, letterSpacing: 1.7 }]}>New note</Text>
                    <Pressable
                        onPress={onSave}
                        disabled={!canSave}
                        style={{
                            height: HIT,
                            minWidth: 84,
                            paddingHorizontal: 18,
                            borderRadius: radius.cta,
                            backgroundColor: canSave ? color.brand : color.inactive,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {saving ? (
                            <ActivityIndicator color={color.surface} size="small" />
                        ) : (
                            <Text
                                style={{
                                    fontFamily: font.extrabold,
                                    fontSize: 14,
                                    color: canSave ? color.surface : color.inactiveFg,
                                }}
                            >
                                Save
                            </Text>
                        )}
                    </Pressable>
                </Gutter>

                <Gutter style={{ paddingTop: 26, flex: 1 }}>
                    <TextInput
                        autoFocus
                        multiline
                        value={body}
                        onChangeText={setBody}
                        placeholder="remind me to…"
                        placeholderTextColor={color.inactiveFg}
                        style={{
                            fontFamily: font.medium,
                            fontSize: 21,
                            lineHeight: 30,
                            color: color.ink,
                            textAlignVertical: 'top',
                            flex: 1,
                        }}
                    />
                </Gutter>

                <Gutter style={{ paddingBottom: space.xl }}>
                    <Card padded={16} style={{ borderRadius: radius.panel }}>
                        <View style={{ gap: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Icon name="clock" size={15} tint={color.brand} weight={2.2} />
                                <Text style={[text.eyebrow, { color: color.ink }]}>Remind me</Text>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {PRESETS.map((p) => {
                                    const on = remind?.kind === 'preset' && remind.label === p;
                                    return (
                                        <Pressable
                                            key={p}
                                            onPress={() => {
                                                setRemind(on ? null : { kind: 'preset', label: p });
                                                setPicking(false);
                                            }}
                                            style={{
                                                height: HIT,
                                                paddingHorizontal: 16,
                                                borderRadius: radius.pill,
                                                backgroundColor: on ? color.brandTint : color.field,
                                                borderWidth: 1,
                                                borderColor: on ? color.brand : color.fieldBorder,
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontFamily: on ? font.extrabold : font.bold,
                                                    fontSize: 13,
                                                    color: on ? color.brand : color.muted,
                                                }}
                                            >
                                                {p}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                                <Pressable
                                    onPress={() => {
                                        // Opening on a preset carries its
                                        // instant into the picker, so picking by
                                        // hand starts from what was selected
                                        // rather than from today at this minute.
                                        // The body has autoFocus, so the
                                        // keyboard is up and would cover the
                                        // picker this opens underneath it.
                                        Keyboard.dismiss();
                                        if (remind?.kind !== 'at') {
                                            const from = remindToIso(remind);
                                            setRemind({ kind: 'at', date: from ? new Date(from) : new Date() });
                                            setPicking(true);
                                        } else {
                                            setPicking(!picking);
                                        }
                                    }}
                                    accessibilityRole="button"
                                    style={{
                                        height: HIT,
                                        paddingHorizontal: 16,
                                        borderRadius: radius.pill,
                                        backgroundColor: custom ? color.brandTint : color.field,
                                        borderWidth: 1,
                                        borderColor: custom ? color.brand : color.fieldBorder,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 7,
                                    }}
                                >
                                    <Icon
                                        name="calendar"
                                        size={14}
                                        tint={custom ? color.brand : color.muted}
                                        weight={2.1}
                                    />
                                    <Text
                                        style={{
                                            fontFamily: custom ? font.extrabold : font.bold,
                                            fontSize: 13,
                                            color: custom ? color.brand : color.muted,
                                        }}
                                    >
                                        {remind?.kind === 'at' ? pickedLabel(remind.date) : 'Pick a date'}
                                    </Text>
                                </Pressable>
                            </View>
                            {picking && remind?.kind === 'at' ? (
                                <WhenPicker
                                    value={remind.date}
                                    onChange={(date) => setRemind({ kind: 'at', date })}
                                />
                            ) : null}
                        </View>
                    </Card>
                </Gutter>

                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: color.hairline,
                        backgroundColor: color.surface,
                        paddingHorizontal: space.gutter,
                        paddingTop: 12,
                        paddingBottom: Math.max(insets.bottom, space.md),
                        flexDirection: 'row',
                        gap: 10,
                    }}
                >
                    {/*
                      * There was an image button here. Attaching media needs
                      * expo-image-picker and POST /api/v1/media, neither of
                      * which the app has yet, and a button that does nothing at
                      * all is worse than no button: it reads as the app
                      * failing. Bring it back with the upload behind it.
                      */}
                    <Pressable
                        onPress={() => router.replace({ pathname: '/compose', params: { text: body.trim() } })}
                        style={{
                            flex: 1,
                            height: 46,
                            borderRadius: radius.cta,
                            backgroundColor: color.ink,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        <Icon name="sparkle" size={17} tint={color.cream} />
                        <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.cream }}>
                            Turn into a post
                        </Text>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
