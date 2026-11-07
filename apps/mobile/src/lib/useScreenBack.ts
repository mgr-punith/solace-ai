import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { router, useFocusEffect, usePathname, type Href } from 'expo-router';

/** Pop normal history; direct-entry screens return to a useful parent instead of exiting. */
export function useScreenBack(fallback: Href) {
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [fallback]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => subscription.remove();
    }, [goBack]),
  );
  return goBack;
}

/** Keep Android Back inside the tabs until the user reaches Home with no history. */
export function useTabBack() {
  const pathname = usePathname();
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        if (pathname !== '/home') {
          router.replace('/home');
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }, [pathname]),
  );
}
