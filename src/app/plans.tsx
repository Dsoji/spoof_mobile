import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { PlanList } from '@/components/PlanCards';
import { Button, Gutter, IconButton, Screen, Segmented } from '@/components/ui';
import { PLANS } from '@/data/mock';
import { space, text } from '@/theme';

/** The Paystack paywall — web and Android. Naira, VAT-inclusive. */
export default function Plans() {
    const [interval, setInterval] = useState('monthly');

    return (
        <Screen
            scroll
            footer={
                <>
                    <Button label="Continue with Pro" onPress={() => router.push('/checkout')} />
                    <Text style={[text.micro, { textAlign: 'center' }]}>
                        Naira prices include 7.5% VAT. Cancel anytime.
                    </Text>
                </>
            }
        >
            <Gutter style={{ paddingHorizontal: space.xxl }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />

                <View style={{ paddingTop: 22, gap: 9 }}>
                    <Text style={text.display}>Cook without limits</Text>
                    <Text style={[text.bodyLg, { fontSize: 14.5, lineHeight: 22 }]}>
                        Your trial ends in 2 days. Keep your channels connected.
                    </Text>
                </View>

                <View style={{ paddingTop: 20 }}>
                    <Segmented
                        value={interval}
                        onChange={setInterval}
                        options={[
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'annual', label: 'Annual', badge: '−20%' },
                        ]}
                    />
                </View>

                <View style={{ paddingTop: 16 }}>
                    <PlanList plans={PLANS.paystack} />
                </View>
            </Gutter>
        </Screen>
    );
}
