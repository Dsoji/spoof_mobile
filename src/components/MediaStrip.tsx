import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Icon } from '@/components/Icon';
import { color, font, radius, HIT } from '@/theme';
import type { MediaItem } from '@/api/media';

/**
 * What is attached to a post, and the control that attaches more.
 *
 * Thumbnails come from the LOCAL file, not the uploaded url: the file is
 * already on the phone, and asking Bunny for a copy of something that was just
 * sent from here would put a spinner in front of a picture the user is holding.
 *
 * A video shows a dark tile rather than a frame — pulling a poster frame needs
 * a thumbnail library the app does not ship, and an empty grey box pretending
 * to be a preview is worse than a tile that says "video".
 */
export function MediaStrip({
    items,
    uploading,
    onAdd,
    onRemove,
    disabled = false,
}: {
    items: MediaItem[];
    /** An upload in flight, shown as a tile at the end of the strip. */
    uploading?: boolean;
    onAdd: () => void;
    onRemove: (url: string) => void;
    disabled?: boolean;
}) {
    const empty = items.length === 0 && !uploading;

    if (empty) {
        return (
            <Pressable
                onPress={disabled ? undefined : onAdd}
                accessibilityRole="button"
                accessibilityLabel="Add a photo or video"
                accessibilityState={{ disabled }}
                style={{
                    height: HIT,
                    paddingHorizontal: 16,
                    borderRadius: radius.pill,
                    backgroundColor: color.field,
                    borderWidth: 1,
                    borderColor: color.fieldBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    gap: 8,
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                <Icon name="image" size={16} tint={color.muted} weight={2.1} />
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: color.muted }}>Photo or video</Text>
            </Pressable>
        );
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 9, paddingRight: 4 }}
        >
            {items.map((item) => (
                <Tile key={item.url} item={item} onRemove={() => onRemove(item.url)} disabled={disabled} />
            ))}

            {uploading ? (
                <View
                    style={{
                        width: 78,
                        height: 78,
                        borderRadius: radius.card,
                        backgroundColor: color.field,
                        borderWidth: 1,
                        borderColor: color.fieldBorder,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    accessibilityLabel="Uploading"
                >
                    <ActivityIndicator size="small" color={color.muted} />
                </View>
            ) : null}

            <Pressable
                onPress={disabled ? undefined : onAdd}
                accessibilityRole="button"
                accessibilityLabel="Add another photo or video"
                style={{
                    width: 78,
                    height: 78,
                    borderRadius: radius.card,
                    backgroundColor: color.field,
                    borderWidth: 1,
                    borderColor: color.fieldBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                <Icon name="plus" size={20} tint={color.muted} weight={2.2} />
            </Pressable>
        </ScrollView>
    );
}

function Tile({ item, onRemove, disabled }: { item: MediaItem; onRemove: () => void; disabled: boolean }) {
    const isVideo = item.type === 'video';

    return (
        <View style={{ width: 78, height: 78 }}>
            <View
                style={{
                    width: 78,
                    height: 78,
                    borderRadius: radius.card,
                    overflow: 'hidden',
                    backgroundColor: isVideo ? color.ink : color.field,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {isVideo ? (
                    <Icon name="play" size={22} tint={color.cream} weight={2.2} />
                ) : (
                    <Image
                        source={{ uri: item.localUri }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        accessibilityLabel="Attached image"
                    />
                )}
            </View>

            {/* Outside the clipped tile, so the corner is not cut off. */}
            <Pressable
                onPress={disabled ? undefined : onRemove}
                accessibilityRole="button"
                accessibilityLabel="Remove this attachment"
                hitSlop={10}
                style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    width: 23,
                    height: 23,
                    borderRadius: radius.pill,
                    backgroundColor: color.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name="close" size={12} tint={color.cream} weight={2.6} />
            </Pressable>
        </View>
    );
}
