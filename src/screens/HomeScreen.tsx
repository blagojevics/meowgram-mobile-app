import React, { useEffect, useState, useRef } from "react";
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
  getDocs,
} from "firebase/firestore";
import { useRoute } from "@react-navigation/native";
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
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<any>(null);
  const route = useRoute();
  const lastScrollParam = useRef<number | null>(null);

  // Listen for custom double-press event emitted from the tab listener
  useEffect(() => {
    const sub = navigation.addListener("tabDoublePress", (e: any) => {
      try {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } catch (err) {
        // ignore
      }
    });
    return sub;
  }, [navigation]);

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

  // Respond to explicit scrollToTop param updates (sent from tab double-press)
  useEffect(() => {
    const param = (route.params as any)?.scrollToTop as number | undefined;
    if (param && param !== lastScrollParam.current) {
      lastScrollParam.current = param;
      // scroll to top
      try {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } catch (err) {
        // ignore if ref not set
      }
    }
  }, [route.params]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const postsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(postsData);
    } catch (err) {
      console.error("Failed to refresh posts:", err);
    } finally {
      setRefreshing(false);
    }
  };

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
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Post
            post={item}
            currentUser={currentUser}
            allowImagePress={currentUser?.uid === item.userId}
          />
        )}
        ListHeaderComponent={renderHeader} // <-- Header scrolls away!
        contentContainerStyle={styles.postsFeed}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
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
