import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const { width } = Dimensions.get("window");
const isMobile = width < 600;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await register(email, password, { name, username });
      Alert.alert("Account created");
      // After register, navigate to the app main tabs
      navigation.replace("MainTabs");
    } catch (err: any) {
      setError(err.message || "Registration failed");
      Alert.alert("Registration error", err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const { googleSignIn } = require("../contexts/AuthContext").useAuth();

  const handleGoogle = async () => {
    setError(null);
    try {
      await googleSignIn();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    }
  };

  return (
    <ImageBackground
      source={{
        uri: "https://img.freepik.com/free-photo/old-cement-wall-texture_1149-1280.jpg?semt=ais_hybrid&w=740&q=80",
      }}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.left}>
            <Text style={styles.leftTitle}>Meowgram.</Text>
            <Text style={styles.leftText}>
              The social network exclusively for our feline friends.
            </Text>
            <Text style={styles.leftSpan}>Do you have an account?</Text>
            <Pressable
              style={styles.loginButton}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.buttonText}>Login</Text>
            </Pressable>
          </View>
          <View style={styles.right}>
            <Text style={styles.rightTitle}>Register</Text>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Unique Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                style={[
                  styles.registerButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <Text style={styles.buttonText}>Register</Text>
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.googleButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleGoogle}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#4285F4" />
                ) : (
                  <View style={styles.googleInner}>
                    <FontAwesome name="google" size={18} color="#4285F4" />
                    <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                      Continue with Google
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(187, 186, 194, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: isMobile ? "column-reverse" : "row-reverse",
    backgroundColor: "white",
    borderRadius: 20,
    width: isMobile ? "90%" : "50%",
    height: isMobile ? 600 : 600,
    overflow: "hidden",
  },
  left: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "rgba(204, 204, 204, 0.7)",
  },
  leftTitle: {
    fontSize: isMobile ? 24 : 40,
    fontWeight: "bold",
    marginBottom: 20,
    color: "black",
  },
  leftText: {
    fontSize: isMobile ? 16 : 22,
    textAlign: "center",
    marginBottom: 20,
    color: "black",
  },
  leftSpan: {
    fontSize: isMobile ? 14 : 18,
    marginBottom: 20,
    color: "black",
  },
  loginButton: {
    backgroundColor: "rgba(171, 171, 171, 1)",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(104, 85, 224, 1)",
  },
  buttonText: {
    color: "black",
    fontWeight: "600",
    textAlign: "center",
  },
  right: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  rightTitle: {
    fontSize: isMobile ? 20 : 40,
    fontWeight: "bold",
    marginBottom: 20,
  },
  form: {
    width: "80%",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "lightgray",
    fontSize: 16,
    marginBottom: 20,
    paddingVertical: 10,
  },
  error: {
    color: "red",
    marginBottom: 20,
    textAlign: "center",
  },
  registerButton: {
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 4,
    paddingVertical: 10,
    width: 200,
    borderWidth: 1,
    borderColor: "rgba(104, 85, 224, 1)",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 4,
    paddingVertical: 10,
    width: 200,
    borderWidth: 1,
    borderColor: "#4285F4",
  },
  googleInner: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default RegisterScreen;
