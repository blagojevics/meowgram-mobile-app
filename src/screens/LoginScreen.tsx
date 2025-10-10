import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ImageBackground,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const { width, height } = Dimensions.get("window");
const isMobile = width < 600;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    console.log("Login button pressed with:", email, password);
    setError(null);
    try {
      console.log("Calling login function...");
      await login(email, password);
      console.log("Login successful!");
      // Navigation will be handled automatically by AppNavigator
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
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
            <Text style={styles.leftTitle}>Welcome to Meowgram</Text>
            <Text style={styles.leftText}>
              Log In and connect with your favourite animals.
            </Text>
            <Text style={styles.leftSpan}>
              Don't have an account? Register now!
            </Text>
            <Pressable
              style={styles.registerButton}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.buttonText}>Register!</Text>
            </Pressable>
          </View>
          <View style={styles.right}>
            <Text style={styles.rightTitle}>Login</Text>
            <View style={styles.form}>
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
              <Pressable style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.buttonText}>Login!</Text>
              </Pressable>
              {/* Google login skipped for now */}
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
    flexDirection: isMobile ? "column" : "row",
    backgroundColor: "white",
    borderRadius: 20,
    width: isMobile ? "90%" : "50%",
    height: isMobile ? 500 : 600,
    overflow: "hidden",
  },
  left: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(204, 204, 204, 0.7)", // Simplified background
  },
  leftTitle: {
    fontSize: isMobile ? 24 : 40,
    fontWeight: "bold",
    marginBottom: 10,
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
    textAlign: "center",
    color: "black",
  },
  registerButton: {
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
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: "100%",
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
  loginButton: {
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 4,
    paddingVertical: 10,
    width: 200,
    borderWidth: 1,
    borderColor: "rgba(104, 85, 224, 1)",
    marginBottom: 10,
  },
});

export default LoginScreen;
