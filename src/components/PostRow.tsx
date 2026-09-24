import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { platformLabel } from '@/api/channels';
import { postWhenLabel, type Post } from '@/api/posts';
import { color, font, radius, shadow, text, tone } from '@/theme';

/**
 * A post in the posts list — as a row, or as a square in the grid — each led
 * by a thumbnail of what the post actually shows.
 */

/** Text-only posts get a colour tile instead of a picture, cycled so a run of them does not read as one block. */
const TEXT_FACES = [
    { bg: color.ink, fg: color.white },
    { bg: color.brand, fg: color.white },
    { bg: tone.orchid, fg: color.ink },
] as const;

function faceFor(post: Post) {
    // Stable per post, so a tile keeps its colour when the list re-sorts.
    let h = 0;
    for (const ch of post.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return TEXT_FACES[Math.abs(h) % TEXT_FACES.length];
}

export type StatusLook = { label: string; bg: string; fg: string; border?: string };

export function statusLook(post: Post): StatusLook {
    switch (post.status) {
        case 'published':
            return { label: `Out · ${postWhenLabel(post)}`, bg: color.successBg, fg: color.success };
        case 'scheduled':
            return { label: postWhenLabel(post), bg: color.brandTint, fg: color.brand };
        case 'failed':
            return { label: 'Failed', bg: color.dangerBg, fg: color.danger };
        default:
            return { label: postWhenLabel(post), bg: color.field, fg: color.muted, border: color.fieldBorder };
    }
}

/** What the platform said, for a post that did not go out. */
export function failureReason(post: Post): string | null {
    const hit = post.platforms.find((t) => t.error);
    if (!hit?.error) return null;
    return `${platformLabel(hit.platform)}: ${hit.error}`;
}

/**
 * The post's first picture, or a stand-in that says what it is.
 *
 * A video's url is the video itself — the studio sends no poster frame — so it
 * gets a dark tile and a play badge rather than a frame the app cannot draw.
 */
export function PostThumb({ post, size, rounded = 16, serif = 40 }: { post: Post; size: number | '100%'; rounded?: number; serif?: number }) {
    const first = post.media[0];
    const box = { width: size, height: size, borderRadius: rounded, overflow: 'hidden' as const };

    if (!first) {
        const face = faceFor(post);
        return (
            <View style={[box, { backgroundColor: face.bg, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontFamily: font.serif, fontSize: serif, lineHeight: serif * 1.15, color: face.fg }}>“</Text>
            </View>
        );
    }

    return <MediaThumb post={post} box={box} />;
}

/** Split out so the load-failure state has a component to live in. */
function MediaThumb({ post, box }: { post: Post; box: { width: number | '100%'; height: number | '100%'; borderRadius: number; overflow: 'hidden' } }) {
    // An expired or unreachable media url should say "picture", not draw an empty square.
    const [broken, setBroken] = useState(false);
    const first = post.media[0];
    const count = post.media.length;
    const video = first.type === 'video';

    return (
        <View style={[box, { backgroundColor: video ? color.ink : tone.sand }]}>
            {video ? null : broken ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="image" size={22} tint={color.muted} weight={2} />
                </View>
            ) : (
                <Image
                    source={{ uri: first.url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={150}
                    onError={() => setBroken(true)}
                />
            )}
            {video ? (
                <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: color.white, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="play" size={12} tint={color.ink} weight={3} />
                    </View>
                </View>
            ) : null}
            {count > 1 ? (
                <View
                    style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        height: 20,
                        paddingHorizontal: 6,
                        borderRadius: 6,
                        backgroundColor: color.ink,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                    }}
                >
                    <Icon name="stack" size={10} tint={color.white} weight={3} />
                    <Text style={{ fontFamily: font.extrabold, fontSize: 10, color: color.white }}>{count}</Text>
                </View>
            ) : null}
        </View>
    );
}

export function StatusPill({ look, small = false }: { look: StatusLook; small?: boolean }) {
    return (
        <View
            style={{
                height: small ? 20 : 22,
                paddingHorizontal: small ? 7 : 8,
                borderRadius: radius.pill,
                backgroundColor: look.bg,
                borderWidth: look.border ? 1 : 0,
                borderColor: look.border,
                justifyContent: 'center',
            }}
        >
            <Text numberOfLines={1} style={[text.badge, { fontSize: small ? 10 : 10.5, color: look.fg }]}>{look.label}</Text>
        </View>
    );
}

/** One post as a list row. Opens the post. */
export function PostRow({ post }: { post: Post }) {
    const look = statusLook(post);
    const reason = post.status === 'failed' ? failureReason(post) : null;

    return (
        <Pressable
            onPress={() => router.push(`/post/${post.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${post.text || 'Untitled post'}. ${look.label}`}
            style={({ pressed }) => [
                {
                    backgroundColor: color.surface,
                    borderRadius: 22,
                    padding: 10,
                    gap: 10,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                },
                shadow.lift,
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <PostThumb post={post} size={78} />
                <View style={{ flex: 1, gap: 7 }}>
                    <Text numberOfLines={2} style={{ fontFamily: font.bold, fontSize: 14.5, lineHeight: 20, color: color.ink }}>
                        {post.text || 'Untitled post'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                        <StatusPill look={look} />
                        {post.platforms.map((t) => (
                            <View key={t.platform} style={{ height: 22, paddingHorizontal: 7, borderRadius: radius.pill, backgroundColor: tone.sand, justifyContent: 'center' }}>
                                <Text style={[text.badge, { color: color.ink }]}>{platformLabel(t.platform)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
            {reason ? (
                <View
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        borderRadius: 14,
                        backgroundColor: color.dangerBg,
                        borderWidth: 1,
                        borderColor: color.dangerBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <Icon name="info" size={15} tint={color.danger} weight={2.2} />
                    <Text numberOfLines={3} style={{ flex: 1, fontFamily: font.bold, fontSize: 12.5, lineHeight: 17, color: color.danger }}>
                        {reason}
                    </Text>
                </View>
            ) : null}
        </Pressable>
    );
}

/** One post as a square in the grid. Published posts carry no label — out is the default. */
export function PostTile({ post, size }: { post: Post; size: number }) {
    const look = statusLook(post);
    const face = faceFor(post);

    return (
        <Pressable
            onPress={() => router.push(`/post/${post.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${post.text || 'Untitled post'}. ${look.label}`}
            style={({ pressed }) => ({ width: size, height: size, opacity: pressed ? 0.85 : 1 })}
        >
            {post.media.length ? (
                <PostThumb post={post} size={size} rounded={0} />
            ) : (
                <View style={{ width: size, height: size, backgroundColor: face.bg, padding: 10, justifyContent: 'flex-end' }}>
                    <Text numberOfLines={4} style={{ fontFamily: font.serif, fontSize: 15, lineHeight: 18, color: face.fg }}>
                        {post.text || 'Untitled post'}
                    </Text>
                </View>
            )}
            {post.status !== 'published' ? (
                <View style={{ position: 'absolute', top: 6, left: 6, maxWidth: size - 12 }}>
                    <StatusPill look={look} small />
                </View>
            ) : null}
        </Pressable>
    );
}
