import { Tabs } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/primitives';
import { Icon, type IconName } from '../../components/ui/Icon';
const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'wellness', title: 'Wellness', icon: 'wellness' },
  { name: 'talk', title: 'Talk', icon: 'talk' },
  { name: 'progress', title: 'Progress', icon: 'progress' },
  { name: 'you', title: 'You', icon: 'user' },
];
export default function TabLayout() {
  const { sky, fontsLoaded } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: sky.bottom },
        tabBarActiveTintColor: sky.palette.text,
        tabBarInactiveTintColor: sky.palette.secondary,
        tabBarStyle: {
          backgroundColor: sky.palette.background,
          borderTopColor: sky.surface,
          paddingTop: tokens.spacing.sm,
          paddingBottom: Math.max(bottom, tokens.spacing.sm),
          height:
            tokens.target + tokens.spacing.xl * fontScale + Math.max(bottom, tokens.spacing.sm),
        },
        tabBarLabelStyle: {
          ...tokens.type.caption,
          fontFamily: fontsLoaded ? tokens.type.caption.fontFamily : undefined,
        },
        tabBarItemStyle: { minHeight: tokens.target + tokens.spacing.sm },
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
                variant="caption"
                tone={focused ? 'text' : 'secondary'}
                style={{ textAlign: 'center', paddingHorizontal: tokens.spacing.xs }}
              >
                {tab.title}
              </AppText>
            ),
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: tokens.target,
                  height: tokens.spacing.xl,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: tokens.radius.pill,
                  backgroundColor:
                    tab.name === 'talk'
                      ? tokens.action.background
                      : focused
                        ? sky.surface
                        : tokens.colors.clear,
                }}
              >
                <Icon
                  name={tab.icon}
                  color={
                    tab.name === 'talk'
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
