import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PersonAvatar } from '@/components/InboxBits';
import { Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { conversationsResource, useMe, useMessages } from '@/api/resources';
import { sendMessage, type Message } from '@/api/inbox';
import { platformLabel } from '@/api/channels';
import { relativeLabel } from '@/api/format';
import { color, font, space, text, tone, HIT } from '@/theme';

/**
 * One DM conversation, replied to as the kitchen's account on that platform.
 *
 * Opened from the Chat tab with everything the header needs in the params, so
 * it draws at once while the messages load.
 */
export default function Conversation() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ conversationId: string; accountId: string; name?: string; platform?: string; picture?: string }>();
    const { conversationId, accountId } = params;
    const name = params.name || 'Direct message';
    const platform = params.platform ?? '';
    const me = useMe();
    const messages = useMessages(accountId, conversationId);

    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState<string | null>(null);
    const scroll = useRef<ScrollView>(null);

    const list = messages.data ?? [];

    const onSend = async (textToSend = draft) => {
        const body = textToSend.trim();
        if (!body || sending) return;
        setSending(body);
        setDraft('');
        try {
            await sendMessage(conversationId, accountId, body);
            await messages.refresh();
            // The list's last-message line and unread count are now stale.
            void conversationsResource.refresh();
        } catch (e) {
            // Put their words back rather than lose them.
            setDraft(body);
            toast(e instanceof Error ? e.message : 'Could not send that.');
        } finally {
            setSending(null);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.cream }}>
            <View
                style={{
                    paddingTop: insets.top + space.md,
                    paddingHorizontal: space.gutter,
                    paddingBottom: space.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: color.hairline,
                }}
            >
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={{ width: HIT, height: HIT, borderRadius: HIT / 2, backgroundColor: tone.sand, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Icon name="chevronLeft" size={18} tint={color.ink} weight={2.6} />
                </Pressable>
                <PersonAvatar name={name} picture={params.picture || null} platform={platform} size={42} />
                <View style={{ flex: 1, gap: 1, paddingLeft: 2 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.extrabold, fontSize: 16, color: color.ink }}>{name}</Text>
                    <Text numberOfLines={1} style={[text.meta, { fontFamily: font.bold, color: color.muted }]}>
                        {`${platformLabel(platform)} DM${me.data ? ` · to ${me.data.workspace.name}` : ''}`}
                    </Text>
                </View>
            </View>

            <ScrollView
                ref={scroll}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: space.gutter, gap: 8, flexGrow: 1, justifyContent: 'flex-end' }}
                onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
                keyboardShouldPersistTaps="handled"
            >
                {!messages.data && messages.status !== 'error' ? <Loading label="Fetching messages…" /> : null}
                {messages.status === 'error' && !messages.data ? <Failed message={messages.error} onRetry={messages.refresh} /> : null}
                {messages.data && list.length === 0 && !sending ? (
                    <Text style={[text.meta, { textAlign: 'center', color: color.muted }]}>No messages in this conversation yet.</Text>
                ) : null}

                {list.map((m, i) => (
                    <Bubble key={m.id || String(i)} message={m} />
                ))}
                {sending ? <Bubble message={{ id: 'pending', text: sending, direction: 'outgoing', senderName: null, createdAt: null, attachments: [] }} pending /> : null}
            </ScrollView>

            <View style={{ paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md), gap: 6 }}>
                <View
                    style={{
                        minHeight: 56,
                        borderRadius: 28,
                        backgroundColor: color.surface,
                        borderWidth: 1.5,
                        borderColor: color.fieldBorder,
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        paddingLeft: 18,
                        paddingRight: 6,
                        paddingVertical: 5,
                        gap: 6,
                    }}
                >
                    <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={`Message ${name}…`}
                        placeholderTextColor={color.inactiveFg}
                        multiline
                        accessibilityLabel={`Message ${name}`}
                        style={{ flex: 1, minHeight: 44, maxHeight: 120, paddingTop: 12, fontFamily: font.semibold, fontSize: 15, color: color.ink }}
                    />
                    <Pressable
                        onPress={() => onSend()}
                        disabled={!draft.trim() || sending !== null}
                        accessibilityRole="button"
                        accessibilityLabel="Send"
                        style={{
                            width: HIT,
                            height: HIT,
                            borderRadius: HIT / 2,
                            backgroundColor: draft.trim() ? color.brand : color.inactive,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <View style={{ transform: [{ rotate: '-90deg' }] }}>
                            <Icon name="arrowRight" size={18} tint={color.white} weight={2.6} />
                        </View>
                    </Pressable>
                </View>
                <Text style={[text.meta, { textAlign: 'center', color: color.muted }]}>
                    {`Replies go out on ${platformLabel(platform)}${me.data ? ` as ${me.data.workspace.name}` : ''}`}
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

function Bubble({ message: m, pending = false }: { message: Message; pending?: boolean }) {
    const mine = m.direction === 'outgoing';
    const image = m.attachments.find((a) => a.type === 'image' || a.previewUrl);
    return (
        <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 3 }}>
            {image ? (
                <Image
                    source={{ uri: image.previewUrl ?? image.url }}
                    style={{ width: 200, height: 200, borderRadius: 18 }}
                    contentFit="cover"
                    accessibilityLabel="Attachment"
                />
            ) : null}
            {m.text ? (
                <View
                    style={{
                        maxWidth: '80%',
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        borderRadius: 20,
                        borderBottomRightRadius: mine ? 6 : 20,
                        borderBottomLeftRadius: mine ? 20 : 6,
                        backgroundColor: mine ? color.brand : color.surface,
                        borderWidth: mine ? 0 : 1,
                        borderColor: color.hairline,
                        opacity: pending ? 0.6 : 1,
                    }}
                >
                    <Text style={{ fontFamily: font.semibold, fontSize: 14.5, lineHeight: 20, color: mine ? color.white : color.ink }}>{m.text}</Text>
                </View>
            ) : null}
            {pending ? (
                <Text style={[text.meta, { color: color.muted }]}>Sending…</Text>
            ) : m.createdAt ? (
                <Text style={[text.meta, { fontSize: 11, color: color.muted }]}>{relativeLabel(m.createdAt)}</Text>
            ) : null}
        </View>
    );
}
