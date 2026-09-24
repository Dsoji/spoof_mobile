import { Tabs } from 'expo-router';

import { type IconName } from '@/components/Icon';
import { TabBar } from '@/components/TabBar';
import { color } from '@/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
    { name: 'index', title: 'Home', icon: 'home' },
    { name: 'notes', title: 'Notes', icon: 'notes' },
    { name: 'chat', title: 'Chat', icon: 'chat' },
    { name: 'calendar', title: 'Calendar', icon: 'calendar' },
    { name: 'you', title: 'You', icon: 'grid' },
];

const ICONS = Object.fromEntries(TABS.map((t) => [t.name, t.icon]));

export default function TabsLayout() {
    return (
        <Tabs
            tabBar={(props) => <TabBar {...props} icons={ICONS} />}
            screenOptions={{
                headerShown: false,
                sceneStyle: { backgroundColor: color.cream },
            }}
        >
            {TABS.map((t) => (
                <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
            ))}
        </Tabs>
    );
}
