import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../config/firebase";
import {
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reauthenticateWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";

const googleProvider = new GoogleAuthProvider();

export default function SettingsScreen() {
  const [status, setStatus] = useState("");
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStatus("Logged out successfully.");
      // Navigation will be handled by auth state change
    } catch (err) {
      const error = err as Error;
      setStatus("Error logging out: " + error.message);
      Alert.alert("Error", "Error logging out: " + error.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!auth.currentUser?.email) {
      setStatus("No email found for this account.");
      Alert.alert("Error", "No email found for this account.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setStatus("Password reset email sent to " + auth.currentUser.email);
      Alert.alert(
        "Success",
        "Password reset email sent to " + auth.currentUser.email
      );
    } catch (err) {
      const error = err as Error;
      setStatus("Error sending reset email: " + error.message);
      Alert.alert("Error", "Error sending reset email: " + error.message);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
              // Try deleting directly
              await deleteDoc(doc(db, "users", user.uid));
              await deleteUser(user);
              setStatus("Account deleted successfully.");
              Alert.alert("Success", "Account deleted successfully.");
              // Navigation will be handled by auth state change
            } catch (err) {
              const error = err as any; // Firebase errors have a code property
              if (error.code === "auth/requires-recent-login") {
                setStatus("Re-authentication required...");

                try {
                  if (user.providerData[0]?.providerId === "password") {
                    // Email/Password re-auth - for mobile, we'll use a simple prompt
                    Alert.prompt(
                      "Re-enter Password",
                      "Please re-enter your password to delete your account:",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Confirm",
                          onPress: async (password?: string) => {
                            if (!password) {
                              setStatus("Password required to delete account.");
                              Alert.alert(
                                "Error",
                                "Password required to delete account."
                              );
                              return;
                            }
                            try {
                              const credential = EmailAuthProvider.credential(
                                user.email!,
                                password
                              );
                              await reauthenticateWithCredential(
                                user,
                                credential
                              );

                              // Retry deletion after re-auth
                              await deleteDoc(doc(db, "users", user.uid));
                              await deleteUser(user);
                              setStatus("Account deleted successfully.");
                              Alert.alert(
                                "Success",
                                "Account deleted successfully."
                              );
                            } catch (reauthErr) {
                              const reauthError = reauthErr as Error;
                              setStatus(
                                "Re-authentication failed: " +
                                  reauthError.message
                              );
                              Alert.alert(
                                "Error",
                                "Re-authentication failed: " +
                                  reauthError.message
                              );
                            }
                          },
                        },
                      ],
                      "secure-text"
                    );
                  } else if (
                    user.providerData[0]?.providerId === "google.com"
                  ) {
                    // Google re-auth
                    try {
                      await reauthenticateWithPopup(user, googleProvider);

                      // Retry deletion after re-auth
                      await deleteDoc(doc(db, "users", user.uid));
                      await deleteUser(user);
                      setStatus("Account deleted successfully.");
                      Alert.alert("Success", "Account deleted successfully.");
                    } catch (reauthErr) {
                      const reauthError = reauthErr as Error;
                      setStatus(
                        "Re-authentication failed: " + reauthError.message
                      );
                      Alert.alert(
                        "Error",
                        "Re-authentication failed: " + reauthError.message
                      );
                    }
                  }
                } catch (reauthErr) {
                  const reauthError = reauthErr as Error;
                  setStatus("Re-authentication failed: " + reauthError.message);
                  Alert.alert(
                    "Error",
                    "Re-authentication failed: " + reauthError.message
                  );
                }
              } else {
                setStatus("Error deleting account: " + error.message);
                Alert.alert(
                  "Error",
                  "Error deleting account: " + error.message
                );
              }
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.button} onPress={handlePasswordReset}>
            <Text style={styles.buttonText}>Reset Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.buttonText, styles.deleteButtonText]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {status ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  actionsContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#007AFF",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  deleteButtonText: {
    color: "#fff",
  },
  statusContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
