import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, Gutter, IconButton, ListRow, Screen } from '@/components/ui';
import { color, font, radius, space, text } from '@/theme';

/**
 * Plan and billing.
 *
 * A subscription bought through Apple cannot be cancelled inside the app — it
 * has to deep-link to Apple's settings — so this screen states which store the
 * plan came from and sends web subscribers back to the studio.
 */
export default function Billing() {
    return (
        <Screen scroll>
            <Gutter style={{ paddingHorizontal: space.xxl }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />

                <View style={{ paddingTop: 18 }}>
                    <Text style={text.display}>Plan &amp; billing</Text>
                </View>

                <View style={{ paddingTop: 22 }}>
                    <Card padded={18} style={{ borderRadius: radius.panel }}>
                        <View style={{ gap: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <View style={{ gap: 4 }}>
                                    <Text style={text.eyebrow}>Current plan</Text>
                                    <Text style={[text.displayLg, { fontSize: 30, lineHeight: 36 }]}>Pro</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                                    <Text style={{ fontFamily: font.extrabold, fontSize: 18, color: color.ink }}>
                                        $21.99
                                    </Text>
                                    <Text style={{ fontFamily: font.bold, fontSize: 12, color: color.subtle }}>/mo</Text>
                                </View>
                            </View>
                            <View style={{ height: 1, backgroundColor: color.hairline }} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View
                                    style={{
                                        height: 24,
                                        paddingHorizontal: 9,
                                        borderRadius: radius.pill,
                                        backgroundColor: '#f1ece5',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ fontFamily: font.extrabold, fontSize: 10.5, color: color.muted }}>
                                        App Store
                                    </Text>
                                </View>
                                <Text style={[text.meta, { fontFamily: font.semibold, fontSize: 12.5 }]}>
                                    Renews 10 October
                                </Text>
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={{ paddingTop: 22, gap: 9 }}>
                    <Text style={[text.eyebrow, { paddingBottom: 2 }]}>Manage</Text>
                    <ListRow
                        title="Manage in App Store"
                        subtitle="Change or cancel your plan in Apple’s settings"
                        icon="lock"
                        trailing="external"
                    />
                    <ListRow
                        title="Restore purchases"
                        subtitle="Already subscribed on another device?"
                        icon="repeat"
                    />
                    <ListRow title="Billing history" subtitle="Receipts and past charges" icon="file" />
                </View>

                <View style={{ paddingTop: 20 }}>
                    <View
                        style={{
                            backgroundColor: color.brandWash,
                            borderRadius: radius.card,
                            paddingHorizontal: 16,
                            paddingVertical: 15,
                            flexDirection: 'row',
                            gap: 11,
                        }}
                    >
                        <Icon name="info" size={17} tint={color.brand} weight={2.1} />
                        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 12.5, lineHeight: 19, color: color.ink }}>
                            Subscribed on the web instead? Naira billing is managed at spoofkitchen.com, not here.
                        </Text>
                    </View>
                </View>
            </Gutter>
        </Screen>
    );
}
