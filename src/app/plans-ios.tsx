import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PlanList } from '@/components/PlanCards';
import { Button, Gutter, IconButton, Screen, Segmented } from '@/components/ui';
import { PLANS } from '@/data/mock';
import { color, font, space, text, HIT } from '@/theme';

/**
 * The App Store paywall.
 *
 * Two things here are App Review conditions rather than design choices: a
 * visible "Restore purchases" control, and a disclosure naming the plan, price,
 * period and auto-renewal terms with links to Terms and Privacy. Purchases run
 * through RevenueCat, which reconciles Apple's receipts against the same
 * `workspaces.plan` the Paystack webhook writes.
 */
export default function PlansIOS() {
    const [interval, setInterval] = useState('monthly');

    return (
        <Screen
            scroll
            footer={
                <>
                    <Button label="Subscribe to Pro" />
                    <Pressable style={{ minHeight: HIT, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={text.link}>Restore purchases</Text>
                    </Pressable>
                    <Text style={[text.micro, { textAlign: 'center', fontSize: 11 }]}>
                        Pro · $21.99 per month. Charged to your Apple Account. Renews automatically unless
                        cancelled at least 24 hours before the period ends.{' '}
                        <Text style={{ color: color.subtle, fontFamily: font.bold }}>Terms</Text> ·{' '}
                        <Text style={{ color: color.subtle, fontFamily: font.bold }}>Privacy</Text>
                    </Text>
                </>
            }
        >
            <Gutter style={{ paddingHorizontal: space.xxl }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />

                <View style={{ paddingTop: 18, gap: 8 }}>
                    <Text style={text.display}>Cook without limits</Text>
                    <Text style={[text.bodyLg, { fontSize: 14.5, lineHeight: 21 }]}>Your trial ends in 2 days.</Text>
                </View>

                <View style={{ paddingTop: 18 }}>
                    <Segmented
                        value={interval}
                        onChange={setInterval}
                        options={[
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'annual', label: 'Annual', badge: '−20%' },
                        ]}
                    />
                </View>

                <View style={{ paddingTop: 14 }}>
                    <PlanList plans={PLANS.appStore} />
                </View>
            </Gutter>
        </Screen>
    );
}
