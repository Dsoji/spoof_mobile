import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { color, font, layout, radius, shadow, space } from '@/theme';

/**
 * Transient messages.
 *
 * These replace `Alert.alert` for outcomes the user does not have to decide
 * anything about — a save that failed, a code that was sent. An Alert is a
 * modal: it seizes focus, blocks the screen, and demands a tap to dismiss,
 * which is a heavy price for "that didn't work, try again". Alert is still the
 * right control for a real question, so the delete confirmation keeps it.
 *
 * The queue holds one message. A second toast replaces the first rather than
 * stacking: these appear in response to a tap, and a user who taps twice wants
 * the newer answer, not a pile.
 */

export type ToastTone = 'error' | 'success' | 'info';

/**
 * `visible` is on the store rather than in the host's own state so the host
 * holds none at all. A toast has to outlive its own dismissal long enough to
 * animate out, and tracking that locally means writing state from an effect —
 * which React's rules reject, and which is a genuine re-render loop waiting to
 * happen. Leaving on a flag and clearing from the animation's completion
 * callback keeps one source of truth.
 */
type Toast = { id: number; message: string; tone: ToastTone; visible: boolean };

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

const snapshot = () => current;

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function publish(next: Toast | null) {
    current = next;
    listeners.forEach((l) => l());
}

/** Show a message. Call from anywhere — no context, no hook, no provider prop. */
export function toast(message: string, tone: ToastTone = 'error') {
    publish({ id: nextId++, message, tone, visible: true });
}

/** Begin leaving. The row is dropped once the exit animation finishes. */
export function dismissToast() {
    if (!current?.visible) return;
    publish({ ...current, visible: false });
}

const TONE: Record<ToastTone, { icon: IconName; tint: string }> = {
    error: { icon: 'info', tint: color.danger },
    success: { icon: 'check', tint: color.success },
    info: { icon: 'info', tint: color.brand },
};

/** How long each tone lingers. Failures need re-reading; confirmations do not. */
const LINGER: Record<ToastTone, number> = {
    error: 4200,
    success: 2600,
    info: 3200,
};

/**
 * Renders the current toast. Mounted once, above the navigator, so a message
 * survives the screen that raised it navigating away.
 */
export function ToastHost() {
    const active = useSyncExternalStore(subscribe, snapshot, snapshot);
    const insets = useSafeAreaInsets();

    const slide = useMemo(() => new Animated.Value(0), []);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const id = active?.id;
    const visible = active?.visible ?? false;

    useEffect(() => {
        if (timer.current) clearTimeout(timer.current);
        if (!active) return;

        if (active.visible) {
            slide.setValue(0);
            Animated.timing(slide, {
                toValue: 1,
                duration: 240,
                easing: Easing.bezier(0.2, 0.7, 0.2, 1),
                useNativeDriver: true,
            }).start();

            timer.current = setTimeout(dismissToast, LINGER[active.tone]);
            return;
        }

        Animated.timing(slide, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
        }).start(({ finished }) => {
            // Clearing from the animation callback rather than an effect: by
            // here the row really is gone, and nothing re-renders in a loop.
            if (finished) publish(null);
        });
        // `id` and `visible` rather than `active`: a re-publish of the same
        // toast in the same state should not restart the animation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, visible, slide]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    if (!active) return null;

    const shown = active;
    const tone = TONE[shown.tone];

    return (
        <Animated.View
            pointerEvents="box-none"
            style={{
                position: 'absolute',
                top: insets.top + layout.headerTop,
                left: space.gutter,
                right: space.gutter,
                opacity: slide,
                transform: [
                    { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
                ],
            }}
        >
            <Pressable
                onPress={dismissToast}
                accessibilityRole="alert"
                accessibilityLabel={shown.message}
                style={[
                    {
                        minHeight: 54,
                        borderRadius: radius.card,
                        backgroundColor: color.surface,
                        borderWidth: 1,
                        borderColor: color.hairline,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 11,
                    },
                    shadow.card,
                ]}
            >
                <Icon name={tone.icon} size={17} tint={tone.tint} weight={2.2} />
                <Text
                    style={{
                        flex: 1,
                        fontFamily: font.semibold,
                        fontSize: 13.5,
                        lineHeight: 19,
                        color: color.ink,
                    }}
                >
                    {shown.message}
                </Text>
            </Pressable>
        </Animated.View>
    );
}
