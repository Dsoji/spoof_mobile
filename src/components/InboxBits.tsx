import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { platformColor, platformMark } from '@/api/channels';
import { color, font, tone } from '@/theme';

/** Small shared pieces of the Chat tab and its screens. */

/** A platform's colour disc with its short mark. `inverted` for sitting on the platform colour itself. */
export function PlatformDot({ platform, size = 22, inverted = false, ring }: { platform: string; size?: number; inverted?: boolean; ring?: string }) {
    const brand = platformColor(platform) ?? color.ink;
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: inverted ? color.white : brand,
                borderWidth: ring ? 2.5 : 0,
                borderColor: ring,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ fontFamily: font.extrabold, fontSize: size * 0.4, color: inverted ? brand : color.white }}>{platformMark(platform)}</Text>
        </View>
    );
}

/** The initial or picture of whoever is on the other end, with their platform on the corner. */
export function PersonAvatar({ name, picture, platform, size = 50 }: { name: string; picture: string | null; platform: string; size?: number }) {
    return (
        <View>
            <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: tone.lilac, alignItems: 'center', justifyContent: 'center' }}>
                {picture ? (
                    <Image source={{ uri: picture }} style={{ width: size, height: size }} contentFit="cover" />
                ) : (
                    <Text style={{ fontFamily: font.serif, fontSize: size * 0.44, lineHeight: size * 0.52, color: color.chipSelectedFg }}>
                        {name.replace(/^@/, '').charAt(0).toUpperCase() || '?'}
                    </Text>
                )}
            </View>
            <View style={{ position: 'absolute', right: -4, bottom: -4 }}>
                <PlatformDot platform={platform} size={Math.round(size * 0.44)} ring={color.cream} />
            </View>
        </View>
    );
}

