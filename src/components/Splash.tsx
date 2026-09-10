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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    Animated,
    Easing,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwirlMark, Wordmark } from '@/components/Icon';
import { useSession } from '@/api/useSession';
import { HANDOFF } from '@/theme/handoff';
import { color, layout, space } from '@/theme';

/** Must equal `imageWidth` in the `expo-splash-screen` config. */
const MARK = 180;

/** The studio's `--ease-brand`, so motion here matches motion there. */
const EASE = Easing.bezier(0.2, 0.7, 0.2, 1);

const SPIN_MS = 1100;
const FADE_MS = 320;
/** The mark's flight onto the welcome screen. */
const FLY_MS = 620;
/** Mount to hand-off complete. */
const SPLASH_MS = 2500;
/**
 * How long the mark holds before it leaves. The flight is part of the 2.5s,
 * not added to it, so the budget is what the user actually waits.
 */
const MIN_VISIBLE_MS = SPLASH_MS - FLY_MS;


/**
 * The drifting colour behind the mark.
 *
 * Four soft blobs — two brand violet, two accent orange — each a radial
 * gradient fading to fully transparent, scaled well past the screen and drifted
 * on long, mismatched periods so the field never visibly repeats. There is no
 * blur here and none is needed: a radial gradient with a transparent outer stop
 * IS the soft edge, which matters because the app ships no blur dependency and
 * a real blur over a full screen is expensive on every frame.
 *
 * Only `transform` and `opacity` are animated, so the whole field runs on the
 * native driver and never touches the JS thread — the splash is on screen
 * precisely while the JS thread is busy with fonts and the first fetch, so an
 * animation that needed it would stutter exactly when it is visible.
 *
 * The studio's rule is that its `.wash-*` backdrops are "orange or indigo only,
 * never blended". That governs those standalone washes; the landing page's own
 * root gradient runs white→orange→violet, and this is the same kind of surface
 * — a full-bleed ground, not a wash behind a feature visual. Colours are the
 * `brand`, `brandHover` and `accent` tokens, unmodified.
 */
function Smoke({ still }: { still: boolean }) {
    const { width, height } = useWindowDimensions();
    // Oversized so a blob's transparent edge is never visible at the bezel.
    const size = Math.max(width, height) * 1.15;

    const drift = useMemo(() => [0, 1, 2, 3].map(() => new Animated.Value(0)), []);
    const fade = useMemo(() => new Animated.Value(0), []);

    const blobs = useMemo(
        () => [
            { id: 'sm0', tint: color.brand, opacity: 0.5, x: -0.3, y: -0.28, travel: 46, ms: 9000 },
            { id: 'sm1', tint: color.accent, opacity: 0.42, x: 0.34, y: -0.16, travel: -38, ms: 11000 },
            { id: 'sm2', tint: color.brandHover, opacity: 0.34, x: 0.26, y: 0.34, travel: 52, ms: 13000 },
            { id: 'sm3', tint: color.accent, opacity: 0.3, x: -0.3, y: 0.3, travel: -44, ms: 15000 },
        ],
        [],
    );

    useEffect(() => {
        // Fades in rather than appearing at full strength: the native splash is
        // a flat cream field, so colour that snaps on at mount would turn an
        // otherwise invisible handoff into a visible one.
        Animated.timing(fade, {
            toValue: 1,
            duration: still ? 0 : 900,
            easing: EASE,
            useNativeDriver: true,
        }).start();

        if (still) return;

        const loops = drift.map((value, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(value, {
                        toValue: 1,
                        duration: blobs[i].ms,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: 0,
                        duration: blobs[i].ms,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ]),
            ),
        );
        loops.forEach((l) => l.start());
        return () => loops.forEach((l) => l.stop());
    }, [drift, fade, blobs, still]);

    return (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="none">
            {blobs.map((blob, i) => (
                <Animated.View
                    key={blob.id}
                    style={{
                        position: 'absolute',
                        width: size,
                        height: size,
                        left: width / 2 - size / 2 + width * blob.x,
                        top: height / 2 - size / 2 + height * blob.y,
                        transform: [
                            {
                                translateX: drift[i].interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, blob.travel],
                                }),
                            },
                            {
                                translateY: drift[i].interpolate({
                                    inputRange: [0, 1],
                                    // Not equal to travel, so the path is a slow
                                    // diagonal rather than a visible straight line.
                                    outputRange: [0, blob.travel * -0.6],
                                }),
                            },
                            {
                                scale: drift[i].interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.12],
                                }),
                            },
                        ],
                    }}
                >
                    <Svg width={size} height={size}>
                        <Defs>
                            <RadialGradient id={blob.id} cx="50%" cy="50%" r="50%">
                                <Stop offset="0%" stopColor={blob.tint} stopOpacity={blob.opacity} />
                                <Stop offset="55%" stopColor={blob.tint} stopOpacity={blob.opacity * 0.35} />
                                <Stop offset="100%" stopColor={blob.tint} stopOpacity={0} />
                            </RadialGradient>
                        </Defs>
                        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${blob.id})`} />
                    </Svg>
                </Animated.View>
            ))}
        </Animated.View>
    );
}

export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
    // useMemo rather than the usual `useRef(new Animated.Value(0)).current`:
    // that idiom reads a ref during render, which this project's
    // react-hooks/refs rule rejects. The value is created once either way.
    const spin = useMemo(() => new Animated.Value(0), []);
    const name = useMemo(() => new Animated.Value(0), []);
    const veil = useMemo(() => new Animated.Value(1), []);
    /** 0 → 1 across the flight. */
    const fly = useMemo(() => new Animated.Value(0), []);
    /** The cream ground and its smoke, faded independently of the mark. */
    const ground = useMemo(() => new Animated.Value(1), []);
    const wordExit = useMemo(() => new Animated.Value(1), []);
    const markFade = useMemo(() => new Animated.Value(1), []);

    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const session = useSession();

    const [reduceMotion, setReduceMotion] = useState(false);

    /**
     * Whether the mark travels, and where to.
     *
     * Both destinations have a mark to land on now — welcome leads its hero
     * with one, home carries a small one beside the greeting — so the only
     * question is which. That is unknowable while the keychain read is in
     * flight, which is why `ready` waits on the session as well as the fonts.
     */
    const flies = session !== 'loading' && !reduceMotion;

    const target = useMemo(() => {
        const rest = session === 'signedIn' ? HANDOFF.home : HANDOFF.welcome;
        // Neither screen centres its mark: it is the leading item in a
        // left-aligned row, under the scroll view's safe-area padding.
        const cx = rest.gutter + rest.markSize / 2;
        const cy = insets.top + layout.headerTop + rest.markTop + rest.markSize / 2;
        return {
            dx: cx - width / 2,
            dy: cy - height / 2,
            scale: rest.markSize / MARK,
        };
    }, [session, insets.top, width, height]);

    // Stamped in an effect rather than as useRef(Date.now()): reading the clock
    // during render is impure, and a re-render before mount would move the
    // floor the dismiss below is measured against. Declared before the effect
    // that reads it, so it is set first on mount.
    const mountedAt = useRef(0);
    useEffect(() => {
        mountedAt.current = Date.now();
    }, []);

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
        // Motion is unwelcome: the straight fade, with the mark simply
        // dissolving where it stands.
        if (!flies) {
            Animated.timing(veil, {
                toValue: 0,
                duration: reduceMotion ? 0 : FADE_MS,
                easing: EASE,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) onDone();
            });
            return;
        }

        Animated.parallel([
            Animated.timing(fly, {
                toValue: 1,
                duration: FLY_MS,
                easing: EASE,
                useNativeDriver: true,
            }),
            // The wordmark goes first and quickly — it has no counterpart on
            // welcome, so carrying it along would only be a second thing
            // moving against the one that matters.
            Animated.timing(wordExit, {
                toValue: 0,
                duration: 200,
                easing: EASE,
                useNativeDriver: true,
            }),
            // The ground clears while the mark is still travelling, so welcome
            // is already reading underneath by the time the mark arrives —
            // the screen assembles around the logo rather than after it.
            Animated.timing(ground, {
                toValue: 0,
                duration: 420,
                delay: 150,
                easing: EASE,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (!finished) return;
            // Landed on top of welcome's own mark, same size and same place,
            // so fading this one out reveals an identical one underneath and
            // the swap cannot be seen.
            Animated.timing(markFade, {
                toValue: 0,
                duration: 140,
                useNativeDriver: true,
            }).start(({ finished: done }) => {
                if (done) onDone();
            });
        });
    }, [flies, veil, fly, ground, wordExit, markFade, reduceMotion, onDone]);

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
            style={[StyleSheet.absoluteFill, { opacity: veil }]}
        >
            {/* The ground is its own layer so it can clear while the mark is
                still in flight above it. */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.field, { opacity: ground }]}>
                {/* Still for anyone who asked for less motion — the colour
                    stays, the drift stops. */}
                <Smoke still={reduceMotion} />
            </Animated.View>

            <View style={[StyleSheet.absoluteFill, styles.centre]}>
                <Animated.View
                    style={{
                        opacity: markFade,
                        transform: [
                            // Translate first, then scale: RN composes these in
                            // order and scales about the element's own centre,
                            // so the centre lands on the target and the mark
                            // shrinks around it rather than drifting off it.
                            {
                                translateX: fly.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, target.dx],
                                }),
                            },
                            {
                                translateY: fly.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, target.dy],
                                }),
                            },
                            {
                                scale: fly.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, target.scale],
                                }),
                            },
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
            </View>

            {/* Absolute, so the name arriving never nudges the mark off the
                spot the native splash parked it on. */}
            <View style={styles.nameSlot}>
                <Animated.View
                    style={{
                        opacity: Animated.multiply(name, wordExit),
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
    },
    centre: {
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
