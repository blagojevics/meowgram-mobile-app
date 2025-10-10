import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import Post from "../components/Post";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const { width } = Dimensions.get("window");
type Props = any;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDoc, setUserDoc] = useState<any>(null);

  const currentUser = user
    ? {
        uid: user.uid,
        username: userDoc?.username || "",
        avatarUrl: "",
        photoURL: "",
      }
    : null;

  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      return;
    }
    const fetchUserDoc = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserDoc(userDocSnap.data());
        } else {
          setUserDoc(null);
        }
      } catch (error) {
        setUserDoc(null);
      }
    };
    fetchUserDoc();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoadingPosts(true);
    setError(null);
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const postsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsData);
        setLoadingPosts(false);
      },
      () => {
        setError("Failed to load posts");
        setLoadingPosts(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  if (!user || !userDoc) {
    return (
      <View style={styles.container}>
        <Text>Loading user data...</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No posts yet. Be the first to add one!</Text>
      </View>
    );
  }

  // The header component for FlatList (will scroll away!)
  const renderHeader = () => (
    <View style={styles.header}>
      <Image
        source={require("../../assets/logohomepage.png")}
        style={[styles.logoImageLarge, { tintColor: colors.logoColor }]}
        resizeMode="contain"
      />
      <TouchableOpacity
        style={[
          styles.themeToggle,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: colors.borderColor,
          },
        ]}
        onPress={toggleTheme}
      >
        <Text style={{ fontSize: 18, color: colors.textPrimary }}>
          {theme === "light" ? "☾" : "☀️"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={["top"]}
    >
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Post post={item} currentUser={currentUser} />
        )}
        ListHeaderComponent={renderHeader} // <-- Header scrolls away!
        contentContainerStyle={styles.postsFeed}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width > 550 ? width * 0.5 : width,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  logoImageLarge: {
    width: 100,
    height: 44,
  },
  themeToggle: {
    borderWidth: 1,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  postsFeed: {
    paddingHorizontal: width < 550 ? 10 : 0,
  },
});

export default HomeScreen;
