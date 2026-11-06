import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';

export default function TabLayout() {
  const { sky, fontsLoaded } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: tokens.colors.clear },
        tabBarActiveTintColor: sky.palette.text,
        tabBarInactiveTintColor: sky.palette.secondary,
        tabBarStyle: {
          backgroundColor: sky.palette.background,
          borderTopColor: sky.palette.secondary,
        },
        tabBarLabelStyle: {
          ...tokens.type.caption,
          fontFamily: fontsLoaded ? tokens.type.caption.fontFamily : undefined,
        },
        tabBarItemStyle: { minHeight: tokens.target },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <View style={[styles.icon, { borderColor: color }]} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <View style={styles.bars}>
              {[tokens.spacing.sm, tokens.spacing.md, tokens.spacing.ml].map((height) => (
                <View
                  key={height}
                  style={{
                    height,
                    width: tokens.spacing.xs,
                    backgroundColor: color,
                    borderRadius: tokens.spacing.xs,
                  }}
                />
              ))}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color }) => (
            <View style={[styles.icon, { borderColor: color, borderRadius: tokens.radius.pill }]} />
          ),
        }}
      />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  icon: {
    height: tokens.spacing.ml,
    width: tokens.spacing.ml,
    borderWidth: tokens.selectedBorder,
    borderRadius: tokens.spacing.xs,
  },
  bars: {
    height: tokens.spacing.ml,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.spacing.xs,
  },
});
