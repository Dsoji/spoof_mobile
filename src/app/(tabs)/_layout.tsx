import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/components/Icon';
import { color, font, layout } from '@/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
    { name: 'index', title: 'Home', icon: 'home' },
    { name: 'notes', title: 'Notes', icon: 'notes' },
    { name: 'calendar', title: 'Calendar', icon: 'calendar' },
    { name: 'you', title: 'You', icon: 'grid' },
];

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: color.brand,
                tabBarInactiveTintColor: color.subtle,
                sceneStyle: { backgroundColor: color.cream },
                tabBarStyle: {
                    backgroundColor: color.surface,
                    borderTopColor: color.hairline,
                    borderTopWidth: 1,
                    height: layout.tabBar + 24,
                    paddingTop: 9,
                },
                tabBarLabelStyle: { fontFamily: font.extrabold, fontSize: 10 },
            }}
        >
            {TABS.map((t) => (
                <Tabs.Screen
                    key={t.name}
                    name={t.name}
                    options={{
                        title: t.title,
                        tabBarIcon: ({ color: tint }) => <Icon name={t.icon} size={22} tint={tint} />,
                    }}
                />
            ))}
        </Tabs>
    );
}
