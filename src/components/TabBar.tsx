import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Tabs } from 'expo-router';

import { Icon, type IconName } from './Icon';
import { color, font, layout, radius, shadow, space } from '@/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * The floating tab bar: a dark pill, the active tab a white capsule carrying
 * its name.
 *
 * It sits in the navigator's normal flow rather than absolutely over the
 * screens, on a cream strip of its own. That keeps every screen's bottom edge —
 * and anything pinned to it, like the Notes add button — above the bar without
 * each screen having to know how tall it is.
 */
export function TabBar({ state, descriptors, navigation, insets, icons }: TabBarProps & { icons: Record<string, IconName> }) {
    return (
        <View
            style={{
                backgroundColor: color.cream,
                paddingHorizontal: space.gutter,
                paddingTop: space.sm,
                paddingBottom: Math.max(insets.bottom, space.lg),
            }}
        >
            <View
                style={[
                    {
                        height: layout.tabBar,
                        borderRadius: radius.pill,
                        backgroundColor: color.ink,
                        paddingHorizontal: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    },
                    shadow.bar,
                ]}
            >
                {state.routes.map((route, index) => {
                    const focused = state.index === index;
                    const title = descriptors[route.key].options.title ?? route.name;

                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            accessibilityRole="tab"
                            accessibilityLabel={title}
                            accessibilityState={{ selected: focused }}
                            style={({ pressed }) => ({
                                height: 48,
                                minWidth: 52,
                                paddingHorizontal: focused ? 16 : 0,
                                borderRadius: radius.pill,
                                backgroundColor: focused ? color.white : 'transparent',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transform: [{ scale: pressed ? 0.94 : 1 }],
                            })}
                        >
                            <Icon
                                name={icons[route.name] ?? 'home'}
                                size={focused ? 20 : 22}
                                tint={focused ? color.brand : color.inactiveFg}
                                weight={focused ? 2.4 : 2}
                            />
                            {focused ? (
                                <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: color.brand }}>{title}</Text>
                            ) : null}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
