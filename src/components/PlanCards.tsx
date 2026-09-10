/**
 * The plan cards, shared by both paywalls.
 *
 * There are two paywalls because there are two price lists: Paystack in Naira
 * on web and Android, and Apple IAP on iOS marked up so the 30% commission
 * still nets the same revenue. Same cards, different numbers and different
 * legal furniture.
 */

import { Text, View } from 'react-native';

import { Icon } from './Icon';
import { Card } from './ui';
import { color, font, radius, text } from '@/theme';

export type PlanCard = {
    key: string;
    name: string;
    tagline: string;
    price: string;
    popular?: boolean;
    features: string[];
};

export function PlanList({ plans }: { plans: readonly PlanCard[] }) {
    return (
        <View style={{ gap: 16 }}>
            {plans.map((p) => (
                <View key={p.key}>
                    <Card selected={p.popular} padded={0}>
                        <View style={{ paddingHorizontal: 18, paddingVertical: 17, gap: 13 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <View style={{ gap: 3 }}>
                                    <Text style={{ fontFamily: font.extrabold, fontSize: 16, color: color.ink }}>
                                        {p.name}
                                    </Text>
                                    <Text style={{ fontFamily: font.semibold, fontSize: 12, color: color.subtle }}>
                                        {p.tagline}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                                    <Text
                                        style={[
                                            text.displaySm,
                                            { color: p.popular ? color.brand : color.ink },
                                        ]}
                                    >
                                        {p.price}
                                    </Text>
                                    <Text style={{ fontFamily: font.bold, fontSize: 12, color: color.subtle }}>/mo</Text>
                                </View>
                            </View>
                            <View style={{ gap: 8 }}>
                                {p.features.map((f) => (
                                    <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                                        <Icon name="check" size={14} tint={color.brand} weight={3} />
                                        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: color.muted }}>
                                            {f}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </Card>

                    {p.popular ? (
                        <View
                            style={{
                                position: 'absolute',
                                top: -11,
                                left: 18,
                                height: 22,
                                paddingHorizontal: 10,
                                borderRadius: radius.pill,
                                backgroundColor: color.brand,
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: font.extrabold,
                                    fontSize: 9.5,
                                    letterSpacing: 0.95,
                                    textTransform: 'uppercase',
                                    color: color.surface,
                                }}
                            >
                                Most popular
                            </Text>
                        </View>
                    ) : null}
                </View>
            ))}
        </View>
    );
}
