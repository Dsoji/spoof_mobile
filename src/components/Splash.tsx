/**
 * The launch screen, continued in JS.
 *
 * The native splash (see the `expo-splash-screen` block in `app.json`) can only
 * show a still image, and it disappears the instant React mounts — which reads
 * as a flash of cream between the mark and the first screen. This overlay picks
 * the mark up in exactly the place and at exactly the size the native one left
 * it (`MARK` here is `imageWidth` there, both centred on a `cream` field), so
 * the handoff is invisible, then turns the still into the brand's swirl and
 * hands off to the app.
 *
 * It also gives the app somewhere to wait: the mark holds while fonts, the
 * stored token and the first fetch land, instead of the user watching an empty
 * screen decide what it is.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { SwirlMark, Wordmark } from '@/components/Icon';
import { color, space } from '@/theme';

/** Must equal `imageWidth` in the `expo-splash-screen` config. */
const MARK = 180;

/** The studio's `--ease-brand`, so motion here matches motion there. */
const EASE = Easing.bezier(0.2, 0.7, 0.2, 1);

const SPIN_MS = 1100;
const FADE_MS = 320;
/** Long enough for the spin to read as deliberate rather than as a stutter. */
const MIN_VISIBLE_MS = SPIN_MS - 200;

export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
    const spin = useRef(new Animated.Value(0)).current;
    const name = useRef(new Animated.Value(0)).current;
    const veil = useRef(new Animated.Value(1)).current;

    const [reduceMotion, setReduceMotion] = useState(false);
    const mountedAt = useRef(Date.now());

    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isReduceMotionEnabled().then((on) => {
            if (alive) setReduceMotion(on);
        });
        return () => {
            alive = false;
        };
    }, []);

    // The intro. One turn of the swirl while the name rises under it — the two
    // are staggered rather than simultaneous so the mark stays the subject.
    useEffect(() => {
        if (reduceMotion) {
            name.setValue(1);
            return;
        }
        Animated.parallel([
            Animated.timing(spin, {
                toValue: 1,
                duration: SPIN_MS,
                easing: EASE,
                useNativeDriver: true,
            }),
            Animated.timing(name, {
                toValue: 1,
                duration: 520,
                delay: 260,
                easing: EASE,
                useNativeDriver: true,
            }),
        ]).start();
    }, [reduceMotion, spin, name]);

    const dismiss = useCallback(() => {
        Animated.timing(veil, {
            toValue: 0,
            duration: reduceMotion ? 0 : FADE_MS,
            easing: EASE,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) onDone();
        });
    }, [veil, reduceMotion, onDone]);

    // Leaving is gated on both the app being ready AND the intro having had
    // time to play. Without the floor, a warm start dismisses on the first
    // frame and the swirl reads as a glitch.
    useEffect(() => {
        if (!ready) return;
        const waited = Date.now() - mountedAt.current;
        const remaining = reduceMotion ? 0 : Math.max(0, MIN_VISIBLE_MS - waited);
        if (remaining === 0) {
            dismiss();
            return;
        }
        const t = setTimeout(dismiss, remaining);
        return () => clearTimeout(t);
    }, [ready, reduceMotion, dismiss]);

    return (
        <Animated.View
            // Not a screen, so it must never take focus or announce itself as
            // one; the mark below carries the label.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.field, { opacity: veil }]}
        >
            <Animated.View
                style={{
                    transform: [
                        {
                            rotate: spin.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                            }),
                        },
                    ],
                }}
            >
                <SwirlMark size={MARK} />
            </Animated.View>

            {/* Absolute, so the name arriving never nudges the mark off the
                spot the native splash parked it on. */}
            <View style={styles.nameSlot}>
                <Animated.View
                    style={{
                        opacity: name,
                        transform: [
                            {
                                translateY: name.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [10, 0],
                                }),
                            },
                        ],
                    }}
                >
                    <Wordmark size={34} mark={false} />
                </Animated.View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    field: {
        backgroundColor: color.cream,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameSlot: {
        position: 'absolute',
        // Below the mark's box, measured from the centred mark rather than
        // from the screen edge so it holds on every device height.
        top: '50%',
        marginTop: MARK / 2 + space.xxl,
        alignItems: 'center',
    },
});
