import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Badge, Button, Card, Gutter, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { channels } from '@/data/mock';
import { color, font, radius, space, text, HIT } from '@/theme';

/**
 * The hand-off out of onboarding.
 *
 * This step has no web counterpart, and it earns its place: without one
 * connected channel the app cannot post, which is the whole point of it. The
 * plan cap is stated here rather than discovered at the moment of failure.
 */
export default function Channels() {
    return (
        <Screen
            footer={
                <>
                    <Button label="Into the kitchen →" onPress={() => router.replace('/(tabs)')} />
                    <Pressable
                        onPress={() => router.replace('/(tabs)')}
                        style={{ minHeight: HIT, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Text style={[text.meta, { fontFamily: font.bold, fontSize: 14 }]}>Skip for now</Text>
                    </Pressable>
                </>
            }
        >
            <Gutter style={{ paddingHorizontal: space.xxl, gap: 12 }}>
                <Text style={text.display}>Plate it somewhere</Text>
                <Text style={[text.bodyLg, { fontSize: 15.5, lineHeight: 23 }]}>
                    Connect at least one channel and you can post straight from your pocket.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 }}>
                    <Badge>Solo plan</Badge>
                    <Text style={[text.meta, { fontFamily: font.semibold }]}>1 slot left — Pro connects all 5</Text>
                </View>
            </Gutter>

            <Gutter style={{ paddingHorizontal: space.xxl, paddingTop: 24, gap: 9 }}>
                {channels.map((c) => (
                    <Card key={c.name} padded={0}>
                        <View
                            style={{
                                minHeight: 68,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
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
                                    backgroundColor: c.connected ? color.brandTint : color.field,
                                    borderWidth: 1,
                                    borderColor: color.hairline,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {/* Placeholder monogram — swap for each platform's official mark. */}
                                <Text
                                    style={{
                                        fontFamily: font.extrabold,
                                        fontSize: 14,
                                        color: c.connected ? color.brand : color.subtle,
                                    }}
                                >
                                    {c.name.charAt(0)}
                                </Text>
                            </View>
                            <View style={{ flex: 1, gap: 3 }}>
                                <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>
                                    {c.name}
                                </Text>
                                <Text
                                    style={{
                                        fontFamily: font.semibold,
                                        fontSize: 12,
                                        color: c.connected ? color.success : color.subtle,
                                    }}
                                >
                                    {c.connected ? c.handle : 'Not connected'}
                                </Text>
                            </View>
                            {c.connected ? (
                                <View
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 13,
                                        backgroundColor: color.successBg,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon name="check" size={14} tint={color.success} weight={3} />
                                </View>
                            ) : (
                                <Pressable
                                    style={{
                                        height: HIT,
                                        paddingHorizontal: 18,
                                        borderRadius: radius.pill,
                                        backgroundColor: color.ink,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ fontFamily: font.extrabold, fontSize: 13.5, color: color.cream }}>
                                        Connect
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </Card>
                ))}
            </Gutter>
        </Screen>
    );
}
