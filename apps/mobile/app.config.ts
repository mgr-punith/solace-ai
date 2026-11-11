import type { ConfigContext, ExpoConfig } from 'expo/config';

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  // Google Sign-In autolinks on Android. Its non-Firebase plugin configures the
  // iOS callback URL scheme supplied by the matching iOS OAuth client.
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
