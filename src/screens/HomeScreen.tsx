import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, Dimensions, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useMockAuth } from "../contexts/MockAuthContext";
import Post from "../components/Post";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

// Dummy data for posts
const dummyPosts = [
  {
    id: "1",
    imageUrl: "https://via.placeholder.com/300",
    caption: "Sample post 1",
    userId: "mockUserId",
    createdAt: { toDate: () => new Date() },
    likesCount: 5,
    likedByUsers: [],
    commentsCount: 2,
  },
  {
    id: "2",
    imageUrl: "https://via.placeholder.com/300",
    caption: "Sample post 2",
    userId: "mockUserId",
    createdAt: { toDate: () => new Date() },
    likesCount: 3,
    likedByUsers: [],
    commentsCount: 1,
  },
  {
    id: "3",
    imageUrl: "https://via.placeholder.com/300",
    caption: "Sample post 3",
    userId: "mockUserId",
    createdAt: { toDate: () => new Date() },
    likesCount: 0,
    likedByUsers: [],
    commentsCount: 0,
  },
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { authUser, userDoc } = useMockAuth();
  const [posts, setPosts] = useState(dummyPosts);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = authUser
    ? {
        uid: authUser.uid,
        username: userDoc?.username || "",
        avatarUrl: "",
        photoURL: "",
      }
    : null;

  useEffect(() => {
    if (!authUser) return;
    // Simulate loading
    setLoadingPosts(true);
    setTimeout(() => {
      setPosts(dummyPosts);
      setLoadingPosts(false);
    }, 1000);
  }, [authUser]);

  if (!authUser || !userDoc) {
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
        {/* ThemeToggle placeholder */}
        <Text>Theme</Text>
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
  logo: {
    fontSize: 20,
    fontWeight: "bold",
  },
  postsFeed: {
    paddingHorizontal: width < 550 ? 10 : 0,
  },
});

export default HomeScreen;
