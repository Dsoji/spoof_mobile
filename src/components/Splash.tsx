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
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwirlMark, Wordmark } from '@/components/Icon';
import { useSession } from '@/api/useSession';
import { markLanded } from '@/lib/mark-handoff';
import { HANDOFF } from '@/theme/handoff';
import { color, font, layout, space, tone } from '@/theme';

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
 * The purple that blooms out of the mark.
 *
 * One brand-coloured disc, sized to the screen's diagonal so at full scale it
 * covers every corner, scaled up from a dot hidden behind the mark. Then the
 * two layered shapes from Home's hero drift in, so the ground the mark leaves
 * is the same ground it lands on.
 *
 * Only `transform` and `opacity` are animated, so it all runs on the native
 * driver — the splash is on screen precisely while the JS thread is busy with
 * fonts and the first fetch, so an animation that needed it would stutter
 * exactly when it is visible.
 */
function Bloom({ progress, shapes }: { progress: Animated.Value; shapes: Animated.Value }) {
    const { width, height } = useWindowDimensions();
    const d = Math.hypot(width, height) + 40;
    const rise = (from: number) => ({ translateY: shapes.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) });

    return (
        <>
            <Animated.View
                style={{
                    position: 'absolute',
                    width: d,
                    height: d,
                    borderRadius: d / 2,
                    left: width / 2 - d / 2,
                    top: height / 2 - d / 2,
                    backgroundColor: color.brand,
                    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }) }],
                }}
            />
            <Animated.View
                style={{
                    position: 'absolute',
                    width: 320,
                    height: 320,
                    borderRadius: 160,
                    right: -120,
                    top: -100,
                    backgroundColor: color.brandHover,
                    opacity: shapes,
                    transform: [rise(-40)],
                }}
            />
            <Animated.View
                style={{
                    position: 'absolute',
                    width: 180,
                    height: 180,
                    borderRadius: 90,
                    left: -70,
                    bottom: 90,
                    backgroundColor: tone.violet,
                    opacity: shapes,
                    transform: [rise(40)],
                }}
            />
        </>
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
    /** The ground and its bloom, faded independently of the mark. */
    const ground = useMemo(() => new Animated.Value(1), []);
    const wordExit = useMemo(() => new Animated.Value(1), []);
    const markFade = useMemo(() => new Animated.Value(1), []);
    /** The purple spreading out from behind the mark, and the hero shapes after it. */
    const bloom = useMemo(() => new Animated.Value(0), []);
    const shapes = useMemo(() => new Animated.Value(0), []);

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
    // The destination's disc padding scaled up to the splash mark, so at the
    // landing scale the two discs are the same size.
    const landing = session === 'signedIn' ? HANDOFF.home : HANDOFF.welcome;
    const discPad = (landing.discPad * MARK) / landing.markSize;

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
        // White clock and battery on the purple. Both destinations open on a
        // purple hero and keep them white; each sets them back itself on blur.
        setStatusBarStyle('light');
        // Backstop: whatever happens to the animation above — interrupted,
        // never started, unmounted mid-flight — the destination must not be
        // left holding an invisible mark forever.
        return markLanded;
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
            bloom.setValue(1);
            shapes.setValue(1);
            return;
        }
        Animated.parallel([
            // A beat on the native still first, so the purple reads as
            // coming OUT of the mark rather than replacing the launch image.
            Animated.timing(bloom, {
                toValue: 1,
                duration: 800,
                delay: 250,
                easing: EASE,
                useNativeDriver: true,
            }),
            Animated.timing(shapes, {
                toValue: 1,
                duration: 700,
                delay: 700,
                easing: EASE,
                useNativeDriver: true,
            }),
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
    }, [reduceMotion, spin, name, bloom, shapes]);

    const dismiss = useCallback(() => {
        // Motion is unwelcome: the straight fade, with the mark simply
        // dissolving where it stands. The destination draws its own from the
        // start, since there is no flight for it to duplicate.
        if (!flies) {
            markLanded();
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
            // Arrived. Reveal the destination's own mark FIRST — it is now
            // exactly underneath this one, same size and same place — and only
            // then fade this one out over it. Revealing it any earlier is two
            // logos on screen at once; any later is a gap with none.
            markLanded();
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
                {/* For anyone who asked for less motion it is simply there,
                    full size, from the first frame. */}
                <Bloom progress={bloom} shapes={shapes} />
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
                    {/* The white disc that keeps the indigo arm legible on purple.
                        Sized so that at the landing scale it is exactly the
                        destination's own disc. */}
                    <Animated.View
                        style={{
                            position: 'absolute',
                            left: -discPad,
                            top: -discPad,
                            width: MARK + discPad * 2,
                            height: MARK + discPad * 2,
                            borderRadius: MARK / 2 + discPad,
                            backgroundColor: color.white,
                            opacity: bloom,
                        }}
                    />
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
                    <View style={{ alignItems: 'center', gap: 14 }}>
                        <Wordmark size={34} mark={false} tint={color.white} />
                        <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: color.ink, transform: [{ rotate: '-4deg' }] }}>
                            <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: color.accent }}>Jot it · Post it · Keep it hot</Text>
                        </View>
                    </View>
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
        left: 0,
        right: 0,
        // Below the mark's box, measured from the centred mark rather than
        // from the screen edge so it holds on every device height.
        top: '50%',
        // Clear of the white disc, whichever destination sized it.
        marginTop: MARK / 2 + (Math.max(HANDOFF.home.discPad / HANDOFF.home.markSize, HANDOFF.welcome.discPad / HANDOFF.welcome.markSize) * MARK) + space.xl,
        alignItems: 'center',
    },
});
