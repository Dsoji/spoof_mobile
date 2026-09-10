import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, Gutter, IconButton, Screen } from '@/components/ui';
import { color, font, radius, space, text, HIT } from '@/theme';

const DRAFT =
    'Everyone’s grinding their beans wrong — and it’s costing you the whole cup. Three fixes, one minute. ☕';

/** Per-platform ceilings live in the web app's src/lib/platform-limits.ts. */
const LIMIT = 2200;

export default function Compose() {
    const [caption, setCaption] = useState(DRAFT);

    return (
        <Screen
            scroll
            footer={
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                        style={{
                            height: 56,
                            paddingHorizontal: 18,
                            borderRadius: 16,
                            backgroundColor: color.field,
                            borderWidth: 1,
                            borderColor: color.fieldBorder,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.muted }}>Draft</Text>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Button
                            label="Publish"
                            icon="arrowRight"
                            iconSide="trailing"
                            onPress={() => router.push('/publish')}
                        />
                    </View>
                </View>
            }
        >
            <Gutter style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />
                <Text style={[text.eyebrow, { fontSize: 12, letterSpacing: 1.7 }]}>New post</Text>
                <View style={{ width: HIT, height: HIT }} />
            </Gutter>

            <Gutter style={{ paddingTop: 22, gap: 10 }}>
                <Text style={text.eyebrow}>Posting to</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['Instagram', 'TikTok'].map((p) => (
                        <View
                            key={p}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                height: HIT,
                                paddingLeft: 8,
                                paddingRight: 13,
                                borderRadius: radius.pill,
                                backgroundColor: color.brandTint,
                                borderWidth: 1.5,
                                borderColor: color.brand,
                            }}
                        >
                            <View
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: color.brand,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ fontFamily: font.extrabold, fontSize: 11, color: color.surface }}>B</Text>
                            </View>
                            <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: color.brand }}>{p}</Text>
                        </View>
                    ))}
                    <Pressable
                        style={{
                            width: HIT,
                            height: HIT,
                            borderRadius: 22,
                            backgroundColor: color.surface,
                            borderWidth: 1,
                            borderStyle: 'dashed',
                            borderColor: color.fieldBorder,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon name="plus" size={18} tint={color.subtle} weight={2.2} />
                    </Pressable>
                </View>
            </Gutter>

            <Gutter style={{ paddingTop: 22 }}>
                <Card padded={18} style={{ borderRadius: radius.panel }}>
                    <View style={{ gap: 16 }}>
                        <TextInput
                            multiline
                            value={caption}
                            onChangeText={setCaption}
                            style={{
                                fontFamily: font.medium,
                                fontSize: 15,
                                lineHeight: 23,
                                color: color.ink,
                                textAlignVertical: 'top',
                                minHeight: 92,
                            }}
                        />
                        <View style={{ height: 1, backgroundColor: color.hairline }} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Pressable
                                style={{
                                    height: HIT,
                                    paddingHorizontal: 15,
                                    borderRadius: radius.pill,
                                    backgroundColor: color.field,
                                    borderWidth: 1,
                                    borderColor: color.fieldBorder,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Icon name="sparkle" size={14} tint={color.muted} weight={2.1} />
                                <Text style={{ fontFamily: font.extrabold, fontSize: 12, color: color.muted }}>
                                    Rewrite
                                </Text>
                            </Pressable>
                            <Text style={[text.meta, { fontFamily: font.bold, fontSize: 11 }]}>
                                {caption.length} / {LIMIT}
                            </Text>
                        </View>
                    </View>
                </Card>
            </Gutter>

            <Gutter style={{ paddingTop: 16, flexDirection: 'row', gap: 10 }}>
                <View
                    style={{
                        width: 84,
                        height: 84,
                        borderRadius: radius.card,
                        backgroundColor: color.brandTint,
                        borderWidth: 1,
                        borderColor: color.hairline,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <Icon name="image" size={26} tint={color.brand} weight={1.8} />
                    <View
                        style={{
                            position: 'absolute',
                            left: 7,
                            bottom: 7,
                            height: 20,
                            paddingHorizontal: 7,
                            borderRadius: 10,
                            backgroundColor: 'rgba(23, 24, 31, 0.82)',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={{ fontFamily: font.extrabold, fontSize: 10, color: color.cream }}>0:47</Text>
                    </View>
                </View>
                <Pressable
                    style={{
                        width: 84,
                        height: 84,
                        borderRadius: radius.card,
                        backgroundColor: color.surface,
                        borderWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: color.fieldBorder,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                    }}
                >
                    <Icon name="plus" size={20} tint={color.subtle} weight={2.2} />
                    <Text style={{ fontFamily: font.extrabold, fontSize: 10, color: color.subtle }}>Media</Text>
                </Pressable>
            </Gutter>

            <Gutter style={{ paddingTop: 20, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Icon name="notes" size={14} tint={color.subtle} weight={2.1} />
                <Text style={[text.meta, { fontFamily: font.semibold }]}>From your note · yesterday</Text>
            </Gutter>
        </Screen>
    );
}
