import { GoogleSignin } from "@react-native-google-signin/google-signin";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: false,
});

export async function signInWithGoogleAsync() {
  try {
    console.log("--- Starting Google Sign-In ---");
    console.log("--- Web Client ID configured:", !!WEB_CLIENT_ID);

    // Check Play Services availability (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    console.log("--- Play Services available ---");

    // Perform sign-in
    const userInfo = await GoogleSignin.signIn();
    console.log("--- Sign-in successful, user:", userInfo.user.email);

    // Get tokens
    const tokens = await GoogleSignin.getTokens();
    console.log("--- Got tokens ---");

    if (!tokens.idToken) {
      throw new Error("No ID token returned from Google");
    }

    return { idToken: tokens.idToken };
  } catch (error: any) {
    console.error("--- Google Sign-In error ---", error);

    // Handle specific error codes
    if (error.code) {
      switch (error.code) {
        case "SIGN_IN_CANCELLED":
          throw new Error("Sign-in was cancelled");
        case "IN_PROGRESS":
          throw new Error("Sign-in is already in progress");
        case "PLAY_SERVICES_NOT_AVAILABLE":
          throw new Error("Google Play Services not available");
        default:
          throw new Error(`Google Sign-In error: ${error.code}`);
      }
    }

    throw error;
  }
}

export default { signInWithGoogleAsync };
