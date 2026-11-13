import { expect, it, jest } from '@jest/globals';

interface AppJson {
  expo: {
    android: { package: string };
    ios: { bundleIdentifier: string; buildNumber: string };
  };
}

interface EasJson {
  build: {
    base: {
      env: {
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: string;
        EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: string;
      };
    };
  };
}

const appJson = jest.requireActual<AppJson>('../../../app.json');
const easJson = jest.requireActual<EasJson>('../../../eas.json');

it('keeps each platform on its registered application identifier', () => {
  expect(appJson.expo.android.package).toBe('com.puneet.solace');
  expect(appJson.expo.ios.bundleIdentifier).toBe('com.humanityfounders.solaceai');
});

it('uses the Google iOS client registered for the App Store bundle', () => {
  expect(easJson.build.base.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID).toBe(
    '51298963652-sbafqm93dnnhgu76svghvuvmo8rknh14.apps.googleusercontent.com',
  );
  expect(easJson.build.base.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME).toBe(
    'com.googleusercontent.apps.51298963652-sbafqm93dnnhgu76svghvuvmo8rknh14',
  );
});

it('advances the iOS build number for the corrected TestFlight upload', () => {
  expect(appJson.expo.ios.buildNumber).toBe('2');
});
