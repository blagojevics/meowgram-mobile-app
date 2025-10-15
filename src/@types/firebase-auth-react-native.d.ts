declare module "firebase/auth/react-native" {
  import type { Auth } from "firebase/auth";
  // Basic declarations for the React Native auth helpers used in the project.
  export function initializeAuth(
    app: any,
    options?: { persistence?: any }
  ): Auth;
  export function getReactNativePersistence(storage: any): any;
}
