import React from "react";
import { MockAuthProvider } from "./src/contexts/MockAuthContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <MockAuthProvider>
      <AppNavigator />
    </MockAuthProvider>
  );
}
