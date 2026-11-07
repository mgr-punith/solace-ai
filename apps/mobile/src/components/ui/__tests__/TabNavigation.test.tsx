import { expect, it, jest } from '@jest/globals';
import { Button, Text } from 'react-native';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, testRouter, screen } from 'expo-router/testing-library';
import TabLayout from '../../../app/(tabs)/_layout';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { useScreenBack } from '../../../lib/useScreenBack';

jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));

it('moves the selected tab and returns through visited tabs on Back', async () => {
  await renderRouter(
    {
      _layout: () => (
        <ThemeProvider>
          <TabLayout />
        </ThemeProvider>
      ),
      home: () => <Text>Home page</Text>,
      wellness: () => <Text>Wellness page</Text>,
      talk: () => <Text>Talk page</Text>,
      progress: () => <Text>Progress page</Text>,
      you: () => <Text>Your page</Text>,
    },
    { initialUrl: '/home' },
  );
  await testRouter.navigate('/wellness');
  await testRouter.navigate('/talk');
  await testRouter.navigate('/you');
  expect(screen.getByRole('button', { name: 'You', selected: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Talk', selected: false })).toBeTruthy();
  await testRouter.back('/talk');
  await testRouter.back('/wellness');
  await testRouter.back('/home');
});

it('returns from a pushed detail to its source and gives a direct entry a parent route', async () => {
  function Detail() {
    const goBack = useScreenBack('/home');
    return <Button title="Back to previous screen" onPress={goBack} />;
  }
  await renderRouter(
    {
      _layout: () => <Stack />,
      home: () => <Text>Home page</Text>,
      wellness: () => <Text>Wellness page</Text>,
      detail: Detail,
    },
    { initialUrl: '/detail' },
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Back to previous screen' }));
  expect(screen).toHavePathname('/home');
  await testRouter.push('/wellness');
  await testRouter.push('/detail');
  await fireEvent.press(screen.getByRole('button', { name: 'Back to previous screen' }));
  expect(screen).toHavePathname('/wellness');
});
