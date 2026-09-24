import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Icon } from './Icon';
import { toast } from './Toast';
import { useKitchens, useMe } from '@/api/resources';
import { initialOf } from '@/api/me';
import { selectWorkspace, useSelectedWorkspaceId } from '@/api/workspace';
import { color, font, radius, shadow, space, text, tone, HIT } from '@/theme';

/** Tallest the list grows before it scrolls — about five kitchens. */
const MAX_LIST = 5 * 60;

/**
 * The kitchen name as a dropdown: tap it, pick another kitchen, and every
 * screen follows — the shared stores clear themselves and refetch on a switch.
 *
 * The panel is a transparent modal anchored under the pill rather than a child
 * of it, because the pill sits inside a hero that clips its overflow, and a
 * menu cut off at the hero's rounded edge is no menu.
 *
 * Creating a kitchen stays on the web: it starts a separate subscription, and
 * that is a checkout, not a tap.
 */
export function KitchenMenu({
    channelCount,
    variant = 'name',
}: {
    channelCount?: number | null;
    /** 'name' spells the kitchen out (You); 'initial' is Home's compact disc beside the greeting. */
    variant?: 'name' | 'initial';
}) {
    const me = useMe();
    const kitchens = useKitchens();
    const selected = useSelectedWorkspaceId();
    const { width } = useWindowDimensions();
    const trigger = useRef<View>(null);
    const [anchor, setAnchor] = useState<{ top: number } | null>(null);
    const [switching, setSwitching] = useState<string | null>(null);

    const list = kitchens.data ?? [];
    // Before the user has ever switched, the active kitchen is the default one.
    const activeId = selected ?? list.find((k) => k.isDefault)?.id ?? me.data?.workspace.id ?? null;
    const open = anchor !== null;

    const show = () => {
        // Refresh in the background so a kitchen joined on the web shows up.
        void kitchens.refresh();
        trigger.current?.measureInWindow((_x, y, _w, h) => setAnchor({ top: y + h + 8 }));
    };
    const close = () => setAnchor(null);

    const onPick = async (id: string, name: string) => {
        if (id === activeId) return close();
        setSwitching(id);
        try {
            // Picking the default explicitly still stores it, so the choice
            // sticks even if the user later joins an older kitchen that would
            // outrank it.
            await selectWorkspace(id);
            toast(`Switched to ${name}.`, 'success');
            close();
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not switch kitchens.');
        } finally {
            setSwitching(null);
        }
    };

    return (
        <>
            <Pressable
                ref={trigger}
                onPress={show}
                disabled={!me.data}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={me.data ? `Kitchen: ${me.data.workspace.name}. Switch kitchens` : 'Switch kitchens'}
                style={({ pressed }) => ({
                    height: HIT,
                    maxWidth: '100%',
                    paddingLeft: variant === 'initial' ? 6 : 16,
                    paddingRight: variant === 'initial' ? 10 : 12,
                    borderRadius: radius.pill,
                    backgroundColor: color.white,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: variant === 'initial' ? 5 : 8,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
            >
                {variant === 'initial' ? (
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.ink }}>{initialOf(me.data)}</Text>
                    </View>
                ) : (
                    <>
                        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.extrabold, fontSize: 14, color: color.ink }}>
                            {me.data ? me.data.workspace.name : ' '}
                        </Text>
                        {channelCount === null || channelCount === undefined ? null : (
                            <Text style={{ fontFamily: font.bold, fontSize: 12.5, color: color.muted }}>
                                {`${channelCount} ${channelCount === 1 ? 'channel' : 'channels'}`}
                            </Text>
                        )}
                    </>
                )}
                <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                    <Icon name="chevronDown" size={14} tint={variant === 'initial' ? color.chipSelectedFg : color.brand} weight={3} />
                </View>
            </Pressable>

            <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
                {/* Tapping anywhere outside the panel closes it. */}
                <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close kitchen menu">
                    <View
                        onStartShouldSetResponder={() => true}
                        style={[
                            {
                                position: 'absolute',
                                top: anchor?.top ?? 0,
                                left: space.gutter,
                                width: width - space.gutter * 2,
                                backgroundColor: color.surface,
                                borderRadius: 22,
                                padding: 8,
                                gap: 4,
                            },
                            shadow.lift,
                        ]}
                    >
                        <Text style={[text.eyebrow, { color: color.muted, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 }]}>
                            Your kitchens
                        </Text>

                        {kitchens.status === 'loading' && !kitchens.data ? (
                            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                                <ActivityIndicator color={color.brand} />
                            </View>
                        ) : null}
                        {kitchens.status === 'error' && !kitchens.data ? (
                            <Pressable onPress={() => void kitchens.refresh()} style={{ minHeight: HIT, paddingHorizontal: 10, justifyContent: 'center' }}>
                                <Text style={[text.meta, { color: color.danger }]}>Couldn’t load your kitchens. Tap to retry.</Text>
                            </Pressable>
                        ) : null}

                        <ScrollView style={{ maxHeight: MAX_LIST }} bounces={false}>
                            {list.map((k) => {
                                const active = k.id === activeId;
                                return (
                                    <Pressable
                                        key={k.id}
                                        onPress={() => void onPick(k.id, k.name)}
                                        disabled={switching !== null}
                                        accessibilityRole="menuitem"
                                        accessibilityState={{ selected: active }}
                                        accessibilityLabel={`${k.name}, ${k.role}, ${k.planName}${active ? ', current' : ''}`}
                                        style={({ pressed }) => ({
                                            minHeight: 56,
                                            paddingHorizontal: 10,
                                            paddingVertical: 8,
                                            borderRadius: 16,
                                            backgroundColor: active ? color.brandWash : pressed ? tone.sand : 'transparent',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 12,
                                        })}
                                    >
                                        <View
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: 12,
                                                backgroundColor: active ? color.brand : tone.sand,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: active ? color.white : color.muted }}>
                                                {k.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <Text numberOfLines={1} style={text.label}>{k.name}</Text>
                                            {/* A Viewer's kitchen is read-only, and they should know before they switch. */}
                                            <Text numberOfLines={1} style={[text.meta, { fontFamily: font.semibold, color: color.muted }]}>
                                                {`${k.role} · ${k.planName}`}
                                            </Text>
                                        </View>
                                        {switching === k.id ? (
                                            <ActivityIndicator color={color.brand} />
                                        ) : active ? (
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color.brand, alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon name="check" size={13} tint={color.white} weight={3} />
                                            </View>
                                        ) : null}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {kitchens.status === 'ready' && list.length === 0 ? (
                            <Text style={[text.meta, { color: color.muted, paddingHorizontal: 10, paddingBottom: 8 }]}>
                                No other kitchens yet. Accept an invitation or create one in the studio.
                            </Text>
                        ) : null}
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}
