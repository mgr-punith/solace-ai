import type { ConfigContext, ExpoConfig } from 'expo/config';

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  // Google Sign-In autolinks on Android. Its non-Firebase plugin configures only
  // the iOS callback, which must come from a real iOS OAuth client (set up later).
  return {
    ...config,
    name: config.name ?? 'Solace',
    slug: config.slug ?? 'solace',
    plugins: [
      ...(config.plugins ?? []),
      ...(iosUrlScheme
        ? [
            ['@react-native-google-signin/google-signin', { iosUrlScheme }] as [
              string,
              { iosUrlScheme: string },
            ],
          ]
        : []),
    ],
  };
}
