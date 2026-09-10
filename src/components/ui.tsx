/**
 * The shared primitives every screen is built from.
 *
 * Nothing here takes a `style` grab-bag by default: variants are named, so a
 * screen says what a thing IS ("a primary CTA", "a selected chip") rather than
 * restating the design. That keeps the two clients from drifting.
 */

import type { ReactElement, ReactNode } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
    type RefreshControlProps,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppleMark, GoogleMark, Icon, type IconName } from './Icon';
import { color, font, layout, radius, shadow, space, text, HIT } from '@/theme';

/* ────────────────────────────── Layout ────────────────────────────── */

/**
 * A screen's cream ground plus safe-area padding.
 *
 * The status bar and home indicator are real chrome on device — the design
 * never paints a fake one — so the inset comes from the OS, not a constant.
 */
export function Screen({
    children,
    scroll = false,
    footer,
    refreshControl,
}: {
    children: ReactNode;
    /** Content taller than the viewport. */
    scroll?: boolean;
    /** Pinned above the home indicator — primary actions live here. */
    footer?: ReactNode;
    /** Pull-to-refresh, for screens backed by a fetch. Requires `scroll`. */
    refreshControl?: ReactElement<RefreshControlProps>;
}) {
    const insets = useSafeAreaInsets();
    const top = insets.top + layout.headerTop;
    const Body = scroll ? ScrollView : View;

    return (
        <View style={{ flex: 1, backgroundColor: color.cream }}>
            <Body
                style={{ flex: 1 }}
                contentContainerStyle={
                    scroll ? { paddingTop: top, paddingBottom: space.xxl } : undefined
                }
                {...(scroll
                    ? { showsVerticalScrollIndicator: false, refreshControl }
                    : { style: { flex: 1, paddingTop: top } })}
            >
                {children}
            </Body>
            {footer ? (
                <View
                    style={{
                        paddingHorizontal: space.gutter,
                        paddingBottom: Math.max(insets.bottom, space.xl),
                        paddingTop: space.md,
                        gap: space.md,
                    }}
                >
                    {footer}
                </View>
            ) : null}
        </View>
    );
}

/** Horizontal page gutter. */
export function Gutter({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
    return <View style={[{ paddingHorizontal: space.gutter }, style]}>{children}</View>;
}

/** A raised surface — the default container for a note, a post, a plan. */
export function Card({
    children,
    selected = false,
    padded = 16,
    style,
}: {
    children: ReactNode;
    /** Purple border + lift, for the chosen option in a set. */
    selected?: boolean;
    padded?: number;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <View
            style={[
                {
                    backgroundColor: color.surface,
                    borderRadius: radius.card,
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? color.brand : color.hairline,
                    padding: padded,
                },
                selected && shadow.feature,
                style,
            ]}
        >
            {children}
        </View>
    );
}

export function Divider() {
    return <View style={{ height: 1, backgroundColor: color.hairline }} />;
}

/* ────────────────────────────── Text ────────────────────────────── */

export function Eyebrow({ children, step = false }: { children: ReactNode; step?: boolean }) {
    return <Text style={step ? text.eyebrowStep : text.eyebrow}>{children}</Text>;
}

/** A section's label plus its optional "See all". */
export function SectionHeader({ label, action }: { label: string; action?: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Eyebrow>{label}</Eyebrow>
            {action ? (
                <Pressable
                    style={{ minHeight: HIT, justifyContent: 'center', paddingLeft: 14 }}
                    hitSlop={8}
                >
                    <Text style={[text.link, { fontSize: 11.5 }]}>{action}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

/* ────────────────────────────── Controls ────────────────────────────── */

/**
 * The primary action. Every button in this app clears the 44pt touch floor —
 * the design review caught several at 34–40 and they all had to grow.
 */
export function Button({
    label,
    onPress,
    variant = 'primary',
    icon,
    iconSide = 'leading',
    disabled = false,
    loading = false,
    height = 56,
}: {
    label: string;
    onPress?: () => void;
    variant?: 'primary' | 'secondary' | 'dark';
    icon?: IconName;
    /** Trailing for forward motion ("Publish →"); leading for everything else. */
    iconSide?: 'leading' | 'trailing';
    disabled?: boolean;
    /** Swaps the label for a spinner and blocks presses. */
    loading?: boolean;
    height?: number;
}) {
    const inert = disabled || loading;
    const bg =
        inert ? color.inactive
            : variant === 'primary' ? color.brand
                : variant === 'dark' ? color.ink
                    : color.surface;
    const fg =
        inert ? color.inactiveFg
            : variant === 'secondary' ? color.ink
                : color.white;

    return (
        <Pressable
            onPress={inert ? undefined : onPress}
            style={({ pressed }) => [
                {
                    height,
                    borderRadius: radius.cta,
                    backgroundColor: bg,
                    borderWidth: variant === 'secondary' ? 1.5 : 0,
                    borderColor: color.fieldBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    opacity: pressed ? 0.9 : 1,
                },
                variant === 'primary' && !inert && shadow.cta,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={fg} />
            ) : (
                <>
                    {icon && iconSide === 'leading' ? <Icon name={icon} size={17} tint={fg} /> : null}
                    <Text style={[text.cta, { color: fg }]}>{label}</Text>
                    {icon && iconSide === 'trailing' ? <Icon name={icon} size={17} tint={fg} /> : null}
                </>
            )}
        </Pressable>
    );
}

/** A square icon control — back, close, month step. */
/**
 * "Continue with Apple" / "Continue with Google".
 *
 * Separate from Button rather than a variant of it because Button draws its
 * icon through `Icon`, which recolours a stroked path with the theme — and
 * these two are filled third-party brand marks that may not be restyled. Apple
 * and Google both publish rules about their mark's colour, clear space and
 * wording, so the mark comes in as a component rather than as a token name.
 *
 * The mark is absolutely positioned so the label stays optically centred in the
 * button rather than being pushed off-centre by the mark's width — which is how
 * both vendors' own buttons are laid out.
 */
export function SocialButton({
    provider,
    label,
    onPress,
    disabled = false,
}: {
    provider: 'apple' | 'google';
    label: string;
    onPress?: () => void;
    disabled?: boolean;
}) {
    const dark = provider === 'apple';
    const bg = disabled ? color.inactive : dark ? color.ink : color.surface;
    const fg = disabled ? color.inactiveFg : dark ? color.white : color.ink;

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({
                height: 56,
                borderRadius: radius.cta,
                backgroundColor: bg,
                // Apple's mark sits on its own black field and needs no edge;
                // Google's white button would otherwise vanish into `surface`.
                borderWidth: dark ? 0 : 1.5,
                borderColor: color.fieldBorder,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
            })}
        >
            <View style={{ position: 'absolute', left: 18, justifyContent: 'center' }}>
                {dark ? <AppleMark size={19} tint={fg} /> : <GoogleMark size={18} />}
            </View>
            <Text style={[text.cta, { color: fg }]}>{label}</Text>
        </Pressable>
    );
}

export function IconButton({ name, onPress, tint = color.ink }: { name: IconName; onPress?: () => void; tint?: string }) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                width: HIT,
                height: HIT,
                borderRadius: radius.cta,
                backgroundColor: color.surface,
                borderWidth: 1,
                borderColor: color.hairline,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Icon name={name} size={19} tint={tint} weight={2.2} />
        </Pressable>
    );
}

/** A read-only status badge — not a touch target, so it may sit under 44pt. */
export function Badge({
    children,
    tone = 'brand',
    icon,
}: {
    children: ReactNode;
    tone?: 'brand' | 'neutral' | 'success';
    icon?: IconName;
}) {
    const bg = tone === 'brand' ? color.brandTint : tone === 'success' ? color.successBg : color.field;
    const fg = tone === 'brand' ? color.brand : tone === 'success' ? color.success : color.muted;
    return (
        <View
            style={{
                height: 24,
                paddingHorizontal: 9,
                borderRadius: radius.pill,
                backgroundColor: bg,
                borderWidth: tone === 'neutral' ? 1 : 0,
                borderColor: color.fieldBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
            }}
        >
            {icon ? <Icon name={icon} size={12} tint={fg} weight={2.2} /> : null}
            <Text style={[text.badge, { color: fg }]}>{children}</Text>
        </View>
    );
}

/** A multi-select chip, matching the web onboarding flow's anatomy. */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                minHeight: HIT,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingLeft: 11,
                paddingRight: 14,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: selected ? color.brand : color.fieldBorder,
                backgroundColor: selected ? color.brandTint : color.white,
            }}
        >
            <View
                style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 1.5,
                    borderColor: selected ? color.brand : color.chipDotBorder,
                    backgroundColor: selected ? color.brand : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {selected ? <Icon name="check" size={10} tint={color.white} weight={3} /> : null}
            </View>
            <Text
                style={{
                    fontFamily: font.semibold,
                    fontSize: 14.5,
                    color: selected ? color.chipSelectedFg : color.chipFg,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

/** The single-select circle on option cards and payment rows. */
export function Radio({ selected }: { selected?: boolean }) {
    return (
        <View
            style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: selected ? color.brand : color.inactive,
                backgroundColor: selected ? color.brand : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {selected ? <Icon name="check" size={12} tint={color.white} weight={3} /> : null}
        </View>
    );
}

/**
 * A two-up segmented control. The track is 52 so each segment clears 44 —
 * at the original 46 the segments measured 38 and failed the touch floor.
 */
export function Segmented({
    options,
    value,
    onChange,
}: {
    options: { value: string; label: string; badge?: string }[];
    value: string;
    onChange?: (v: string) => void;
}) {
    return (
        <View
            style={{
                height: 52,
                borderRadius: 15,
                backgroundColor: '#f1ece5',
                padding: 4,
                flexDirection: 'row',
                gap: 4,
            }}
        >
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <Pressable
                        key={o.value}
                        onPress={() => onChange?.(o.value)}
                        style={[
                            {
                                flex: 1,
                                borderRadius: 11,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 6,
                                backgroundColor: on ? color.surface : 'transparent',
                            },
                            on && shadow.segment,
                        ]}
                    >
                        <Text
                            style={{
                                fontFamily: font.extrabold,
                                fontSize: 13.5,
                                color: on ? color.ink : color.muted,
                            }}
                        >
                            {o.label}
                        </Text>
                        {o.badge ? (
                            <View
                                style={{
                                    height: 19,
                                    paddingHorizontal: 6,
                                    borderRadius: radius.pill,
                                    backgroundColor: color.successBg,
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ fontFamily: font.extrabold, fontSize: 9.5, color: color.success }}>
                                    {o.badge}
                                </Text>
                            </View>
                        ) : null}
                    </Pressable>
                );
            })}
        </View>
    );
}

/** A tappable list row with a leading icon tile — used by settings and billing. */
export function ListRow({
    title,
    subtitle,
    icon,
    trailing = 'chevron',
    onPress,
}: {
    title: string;
    subtitle?: string;
    icon: IconName;
    trailing?: 'chevron' | 'external' | 'none';
    onPress?: () => void;
}) {
    return (
        <Pressable onPress={onPress}>
            <Card padded={0}>
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
                            borderRadius: radius.field - 1,
                            backgroundColor: color.field,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon name={icon} size={19} tint={color.muted} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={text.label}>{title}</Text>
                        {subtitle ? <Text style={[text.meta, { fontFamily: font.medium }]}>{subtitle}</Text> : null}
                    </View>
                    {trailing !== 'none' ? (
                        <Icon
                            name={trailing === 'external' ? 'external' : 'chevronRight'}
                            size={17}
                            tint={color.inactiveFg}
                            weight={2.2}
                        />
                    ) : null}
                </View>
            </Card>
        </Pressable>
    );
}
