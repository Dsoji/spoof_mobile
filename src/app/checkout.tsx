import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Button, Card, Gutter, IconButton, Radio, Screen } from '@/components/ui';
import { color, font, radius, space, text } from '@/theme';

/**
 * Paystack checkout — web and Android only.
 *
 * VAT is shown the way the web app computes it: Naira prices are quoted
 * VAT-INCLUSIVE, so 7.5% comes out of ₦20,354 rather than being added to it.
 */
const METHODS: { key: string; icon: IconName; name: string; sub: string }[] = [
    { key: 'card', icon: 'card', name: 'Card', sub: 'Visa, Mastercard, Verve' },
    { key: 'bank', icon: 'bank', name: 'Bank transfer', sub: 'Pay from your banking app' },
    { key: 'ussd', icon: 'phone', name: 'USSD', sub: 'Dial from any phone' },
];

export default function Checkout() {
    const [method, setMethod] = useState('card');

    return (
        <Screen
            scroll
            footer={
                <>
                    <Button label="Pay ₦20,354" onPress={() => router.dismissAll()} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                        <Icon name="lock" size={13} tint={color.inactiveFg} weight={2.2} />
                        <Text style={[text.micro, { fontFamily: font.semibold }]}>Secured by Paystack</Text>
                    </View>
                </>
            }
        >
            <Gutter style={{ paddingHorizontal: space.xxl }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />

                <View style={{ paddingTop: 22, gap: 8 }}>
                    <Text style={text.eyebrow}>Checkout</Text>
                    <Text style={[text.display, { fontSize: 30, lineHeight: 36 }]}>Pro, monthly</Text>
                </View>

                <View style={{ paddingTop: 22 }}>
                    <Card padded={0}>
                        <View style={{ paddingHorizontal: 18, paddingVertical: 17, gap: 12 }}>
                            <Line label="Pro · Brew by Lagos" value="₦20,354" />
                            <Line label="Includes 7.5% VAT" value="₦1,420" muted />
                            <View style={{ height: 1, backgroundColor: color.hairline }} />
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.ink }}>
                                    Due today
                                </Text>
                                <Text style={text.displaySm}>₦20,354</Text>
                            </View>
                            <Text style={[text.meta, { fontFamily: font.semibold, fontSize: 11.5 }]}>
                                Renews 10 October. Cancel anytime.
                            </Text>
                        </View>
                    </Card>
                </View>

                <View style={{ paddingTop: 22, gap: 10 }}>
                    <Text style={text.eyebrow}>Pay with</Text>
                    {METHODS.map((m) => {
                        const on = m.key === method;
                        return (
                            <Pressable key={m.key} onPress={() => setMethod(m.key)}>
                                <Card selected={on} padded={0}>
                                    <View
                                        style={{
                                            minHeight: 66,
                                            paddingHorizontal: 16,
                                            paddingVertical: 14,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 13,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 12,
                                                backgroundColor: on ? color.brandTint : color.field,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon name={m.icon} size={19} tint={on ? color.brand : color.muted} />
                                        </View>
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <Text style={text.label}>{m.name}</Text>
                                            <Text style={{ fontFamily: font.medium, fontSize: 12, color: color.subtle }}>
                                                {m.sub}
                                            </Text>
                                        </View>
                                        <Radio selected={on} />
                                    </View>
                                </Card>
                            </Pressable>
                        );
                    })}
                </View>
            </Gutter>
        </Screen>
    );
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: color.muted }}>{label}</Text>
            <Text style={{ fontFamily: font.bold, fontSize: 13.5, color: muted ? color.subtle : color.ink }}>
                {value}
            </Text>
        </View>
    );
}
