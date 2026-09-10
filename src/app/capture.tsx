import { useState } from 'react';
import { router } from 'expo-router';
import {
    ActivityIndicator,
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
import { useNotes } from '@/api/useNotes';
import { presetToIso } from '@/api/format';
import { color, font, layout, radius, space, text, HIT } from '@/theme';

const PRESETS = ['Later today', 'Tomorrow, 8:00', 'This weekend'];

/**
 * Jot a note.
 *
 * The note is a `board_items` row of type 'text' — `{ text }` plus, since the
 * studio's 20260910 migration, a nullable `remind_at`. The presets resolve to a
 * real instant on this side of the wire; see presetToIso.
 */
export default function Capture() {
    const insets = useSafeAreaInsets();
    const [body, setBody] = useState('');
    const [remind, setRemind] = useState<string | null>('Tomorrow, 8:00');
    const [saving, setSaving] = useState(false);
    const { create } = useNotes();

    const canSave = body.trim().length > 0 && !saving;

    const onSave = async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            await create({ text: body.trim(), remindAt: remind ? presetToIso(remind) : null });
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
                                    const on = p === remind;
                                    return (
                                        <Pressable
                                            key={p}
                                            onPress={() => setRemind(on ? null : p)}
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
                                    style={{
                                        height: HIT,
                                        paddingHorizontal: 16,
                                        borderRadius: radius.pill,
                                        backgroundColor: color.field,
                                        borderWidth: 1,
                                        borderColor: color.fieldBorder,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 7,
                                    }}
                                >
                                    <Icon name="calendar" size={14} tint={color.muted} weight={2.1} />
                                    <Text style={{ fontFamily: font.bold, fontSize: 13, color: color.muted }}>
                                        Pick a date
                                    </Text>
                                </Pressable>
                            </View>
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
                    <Pressable
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: radius.cta,
                            backgroundColor: color.field,
                            borderWidth: 1,
                            borderColor: color.fieldBorder,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon name="image" size={21} tint={color.muted} weight={2.1} />
                    </Pressable>
                    <Pressable
                        onPress={() => router.replace('/compose')}
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
