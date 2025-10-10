import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
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

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDoc, setUserDoc] = useState<any>(null);

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled automatically by AppNavigator
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const currentUser = user
    ? {
        uid: user.uid,
        username: userDoc?.username || "",
        avatarUrl: "",
        photoURL: "",
      }
    : null;

  // Fetch user document when user changes
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
          console.log("User document not found");
          setUserDoc(null);
        }
      } catch (error) {
        console.error("Error fetching user document:", error);
        setUserDoc(null);
      }
    };

    fetchUserDoc();
  }, [user]);

  useEffect(() => {
    console.log("HomeScreen useEffect triggered, user:", user);
    if (!user) {
      console.log("No user, returning");
      return;
    }

    setLoadingPosts(true);
    setError(null);

    console.log("Setting up Firestore listener...");

    // Fetch posts from Firestore
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log(
          "Firestore snapshot received, docs count:",
          querySnapshot.docs.length
        );
        const postsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Posts data:", postsData);
        setPosts(postsData);
        setLoadingPosts(false);
      },
      (err) => {
        console.error("Error fetching posts:", err);
        setError("Failed to load posts");
        setLoadingPosts(false);
      }
    );

    return () => {
      console.log("Unsubscribing from Firestore listener");
      unsubscribe();
    };
  }, [user]);

  if (!user || !userDoc) {
    return (
      <View style={styles.container}>
        <Text>Loading user data...</Text>
      </View>
    );
  }

  if (loadingPosts) {
    return (
      <View style={styles.container}>
        <Text>Loading posts from your feed...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>Error: {error}</Text>
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

  return (
    <View style={styles.container}>
      {/* Header - Mobile-focused */}
      <View style={styles.header}>
        <Text style={styles.logo}>Meowgram</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Post post={item} currentUser={currentUser} />
        )}
        contentContainerStyle={styles.postsFeed}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    width: width > 550 ? width * 0.5 : width,
    alignSelf: "center",
  },
  header: {
    height: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
  },
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#007AFF",
    borderRadius: 5,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
  },
  postsFeed: {
    paddingHorizontal: width < 550 ? 10 : 0,
  },
});

export default HomeScreen;
