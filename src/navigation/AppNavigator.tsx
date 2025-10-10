import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BackHandler } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

// Screen imports
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AddPostScreen from "../screens/AddPostScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PostDetailScreen from "../screens/PostDetailScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Profile: { userId: string };
  AddPost: undefined;
  Settings: undefined;
  PostDetail: { postId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: { userId?: string };
  Notifications: undefined;
  AddPost: undefined;
};

const MainTabs: React.FC = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Get unread notifications count
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });

    return () => unsub();
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#ddd",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#666",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size * 0.6} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size * 0.6} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size * 0.6} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: "Notifications",
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? "99+"
                : unreadCount.toString()
              : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size * 0.6} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AppNavigatorContent: React.FC = () => {
  const { user, loading } = useAuth();

  console.log("AppNavigator - user:", user, "loading:", loading);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        // Authenticated user - show main tabs
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        </Stack.Navigator>
      ) : (
        // Unauthenticated user - show auth screens
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const AppNavigator: React.FC = () => {
  return <AppNavigatorContent />;
};

export default AppNavigator;
