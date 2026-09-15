import { router } from 'expo-router';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { Card, Gutter, IconButton, Screen } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { useKitchens } from '@/api/resources';
import { selectWorkspace, useSelectedWorkspaceId } from '@/api/workspace';
import { color, font, radius, text } from '@/theme';

/**
 * Switch between kitchens.
 *
 * Each kitchen is its own workspace with its own notes, channels, posts and
 * plan. Picking one changes what every other screen reads — the shared stores
 * clear themselves and refetch — so there is nothing here to keep in sync by
 * hand.
 *
 * Creating a kitchen stays on the web: it starts a separate subscription, and
 * that is a checkout, not a tap.
 */
export default function Kitchens() {
    const kitchens = useKitchens();
    const selected = useSelectedWorkspaceId();
    const [refreshing, setRefreshing] = useState(false);

    const list = kitchens.data ?? [];
    // Before the user has ever switched, the active kitchen is the default one.
    const activeId = selected ?? list.find((k) => k.isDefault)?.id ?? null;

    const onPick = async (id: string, name: string) => {
        if (id === activeId) {
            router.back();
            return;
        }
        // Picking the default explicitly still stores it, so the choice sticks
        // even if the user later joins an older kitchen that would outrank it.
        await selectWorkspace(id);
        toast(`Switched to ${name}.`, 'success');
        router.back();
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await kitchens.refresh();
        setRefreshing(false);
    };

    return (
        <Screen
            scroll
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.muted} />}
        >
            <Gutter>
                <IconButton name="chevronLeft" onPress={() => router.back()} />
            </Gutter>

            <Gutter style={{ paddingTop: 18, gap: 8 }}>
                <Text style={text.display}>Your kitchens</Text>
                <Text style={text.bodyLg}>Everything you jot, schedule and post belongs to one of these.</Text>
            </Gutter>

            <Gutter style={{ paddingTop: 22, gap: 9 }}>
                {kitchens.status === 'loading' ? <Loading label="Fetching your kitchens…" /> : null}
                {kitchens.status === 'error' && !kitchens.data ? (
                    <Failed message={kitchens.error} onRetry={kitchens.refresh} />
                ) : null}
                {kitchens.status === 'ready' && list.length === 0 ? (
                    <Empty icon="grid" title="No kitchens yet" body="Accept an invitation or create one in the studio." />
                ) : null}

                {list.map((k) => {
                    const active = k.id === activeId;
                    return (
                        <Pressable
                            key={k.id}
                            onPress={() => void onPick(k.id, k.name)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={`${k.name}, ${k.role}, ${k.planName}${active ? ', current' : ''}`}
                        >
                            <Card selected={active} padded={0}>
                                <View
                                    style={{
                                        minHeight: 68,
                                        paddingHorizontal: 15,
                                        paddingVertical: 13,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 13,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: radius.field,
                                            backgroundColor: active ? color.brandTint : color.field,
                                            borderWidth: 1,
                                            borderColor: color.hairline,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: active ? color.brand : color.subtle }}>
                                            {k.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, gap: 3 }}>
                                        <Text numberOfLines={1} style={text.label}>
                                            {k.name}
                                        </Text>
                                        <Text numberOfLines={1} style={[text.meta, { fontFamily: font.semibold }]}>
                                            {/* A Viewer's kitchen is read-only, and they should know before they try. */}
                                            {`${k.role} · ${k.planName}`}
                                        </Text>
                                    </View>
                                    {active ? (
                                        <View
                                            style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: 13,
                                                backgroundColor: color.brand,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon name="check" size={14} tint={color.white} weight={3} />
                                        </View>
                                    ) : null}
                                </View>
                            </Card>
                        </Pressable>
                    );
                })}
            </Gutter>
        </Screen>
    );
}
