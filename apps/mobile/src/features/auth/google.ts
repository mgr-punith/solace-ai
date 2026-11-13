import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

export type GoogleSignIn = { signIn: () => Promise<string | null>; signOut: () => Promise<void> };
let configured = false;

export function googleConfigureOptions(platform: typeof Platform.OS) {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId)
    throw new Error('Google sign-in is not configured. Check the app configuration.');
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (platform === 'ios' && !iosClientId)
    throw new Error('Google sign-in is not configured for iOS. Check the app configuration.');
  return { webClientId, ...(platform === 'ios' ? { iosClientId } : {}) };
}

export const googleSignIn: GoogleSignIn = {
  async signIn() {
    if (!configured) {
      GoogleSignin.configure(googleConfigureOptions(Platform.OS));
      configured = true;
    }
    try {
      if (Platform.OS === 'android')
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) return null;
      if (!result.data.idToken)
        throw new Error('Google did not return a sign-in token. Check the Web client ID.');
      return result.data.idToken;
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
        if (error.code === statusCodes.IN_PROGRESS)
          throw new Error('Google sign-in is already open. Finish it on your phone.');
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
          throw new Error('Update Google Play services, then try signing in again.');
        throw new Error(
          'Google sign-in could not finish. Try again; if it continues, check the app package and signing certificate.',
        );
      }
      if (error instanceof Error && error.message.startsWith('Google did not return')) throw error;
      throw new Error('Google sign-in could not finish. Try again.');
    }
  },
  async signOut() {
    if (configured) await GoogleSignin.signOut();
  },
};
