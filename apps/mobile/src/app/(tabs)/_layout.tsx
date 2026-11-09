import { Tabs } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { surfaceAt } from '../../theme/sky';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/primitives';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useTabBack } from '../../lib/useScreenBack';
const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'wellness', title: 'Wellness', icon: 'wellness' },
  { name: 'talk', title: 'Talk', icon: 'talk' },
  { name: 'progress', title: 'Progress', icon: 'progress' },
  { name: 'you', title: 'You', icon: 'user' },
];
export default function TabLayout() {
  useTabBack();
  const { sky } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: surfaceAt(sky, 1) },
        tabBarActiveTintColor: sky.palette.text,
        tabBarInactiveTintColor: sky.palette.secondary,
        tabBarStyle: {
          backgroundColor: sky.surface,
          borderTopColor: sky.outline,
          paddingTop: tokens.spacing.sm,
          paddingBottom: Math.max(bottom, tokens.spacing.sm),
          height:
            tokens.tab.height +
            tokens.type.tab.lineHeight * Math.max(0, fontScale - 1) +
            Math.max(bottom, tokens.spacing.sm),
        },
        tabBarItemStyle: { minHeight: tokens.target },
        tabBarHideOnKeyboard: true,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarLabel: ({ focused }) => (
              <AppText
                variant="tab"
                tone={focused ? 'text' : 'secondary'}
                style={{ textAlign: 'center', marginTop: tokens.tab.labelGap }}
              >
                {tab.title}
              </AppText>
            ),
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: tokens.tab.indicatorWidth,
                  height: tokens.tab.indicatorHeight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: tokens.radius.pill,
                  backgroundColor: focused ? tokens.action.background : tokens.colors.clear,
                }}
              >
                <Icon
                  name={tab.icon}
                  color={
                    focused
                      ? tokens.action.text
                      : typeof color === 'string'
                        ? color
                        : sky.palette.text
                  }
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
