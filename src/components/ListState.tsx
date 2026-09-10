import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { color, font, radius, text, HIT } from '@/theme';

/**
 * The three things a list is when it isn't a list: loading, failed, or empty.
 *
 * Shared because notes appear on Home and on the Notes tab, and a screen that
 * silently renders nothing while a fetch is in flight is indistinguishable
 * from one where the user has no notes — which is the difference between "wait
 * a moment" and "jot something".
 */

export function Loading({ label = 'Loading…' }: { label?: string }) {
    return (
        <View style={{ paddingVertical: 34, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={color.brand} />
            <Text style={[text.meta, { fontFamily: font.semibold }]}>{label}</Text>
        </View>
    );
}

export function Failed({ message, onRetry }: { message?: string; onRetry?: () => void }) {
    return (
        <View style={{ paddingVertical: 30, alignItems: 'center', gap: 14 }}>
            <Icon name="clock" size={22} tint={color.muted} weight={2} />
            <Text style={[text.meta, { fontFamily: font.semibold, textAlign: 'center' }]}>
                {message ?? 'Could not load this right now.'}
            </Text>
            {onRetry ? (
                <Pressable
                    onPress={onRetry}
                    style={{
                        minHeight: HIT,
                        paddingHorizontal: 20,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: color.fieldBorder,
                        backgroundColor: color.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{ fontFamily: font.bold, fontSize: 13, color: color.ink }}>Try again</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export function Empty({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
    return (
        <View style={{ paddingVertical: 34, alignItems: 'center', gap: 10 }}>
            <Icon name={icon} size={24} tint={color.inactiveFg} weight={2} />
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: color.ink }}>{title}</Text>
            {body ? (
                <Text style={[text.meta, { textAlign: 'center', paddingHorizontal: 30 }]}>{body}</Text>
            ) : null}
        </View>
    );
}
