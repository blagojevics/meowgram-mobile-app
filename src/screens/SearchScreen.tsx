import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "MainTabs">;

interface UserResult {
  id: string;
  uid: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

interface PostResult {
  id: string;
  imageUrl: string;
  caption?: string;
  userId: string;
  username: string;
  userAvatar?: string;
  createdAt: any;
}

const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery.trim());
      } else {
        setUserResults([]);
        setPostResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery) return;

    setLoading(true);
    try {
      // Search users
      const usersQuery = query(
        collection(db, "users"),
        where("username", ">=", searchQuery.toLowerCase()),
        where("username", "<=", searchQuery.toLowerCase() + "\uf8ff"),
        limit(10)
      );

      const usersSnap = await getDocs(usersQuery);
      const users = usersSnap.docs.map((doc) => ({
        ...(doc.data() as UserResult),
        id: doc.id,
      }));

      // Search posts by caption
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const postsSnap = await getDocs(postsQuery);
      const allPosts = postsSnap.docs.map((doc) => ({
        ...(doc.data() as PostResult),
        id: doc.id,
      }));

      // Filter posts that contain the search query in caption
      const filteredPosts = allPosts.filter(
        (post) =>
          post.caption &&
          post.caption.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Get user data for posts
      const userIds = [...new Set(filteredPosts.map((post) => post.userId))];
      const userPromises = userIds.map(async (userId) => {
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", userId)
        );
        const userDoc = await getDocs(userQuery);
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data() as UserResult;
          return {
            userId,
            username: userData.username,
            avatarUrl: userData.avatarUrl,
          };
        }
        return { userId, username: "Unknown", avatarUrl: undefined };
      });

      const userDataResults = await Promise.all(userPromises);
      const userDataMap = Object.fromEntries(
        userDataResults.map(({ userId, username, avatarUrl }) => [
          userId,
          { username, avatarUrl },
        ])
      );

      // Add user data to posts
      const postsWithUserData = filteredPosts.map((post) => ({
        ...post,
        username: userDataMap[post.userId]?.username || "Unknown",
        userAvatar: userDataMap[post.userId]?.avatarUrl,
      }));

      setUserResults(users);
      setPostResults(postsWithUserData.slice(0, 10)); // Limit to 10 posts
      setHasSearched(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderUserResult = ({ item }: { item: UserResult }) => (
    <TouchableOpacity
      style={styles.userResult}
      onPress={() => {
        // Navigate to user profile
        console.log("Navigate to user:", item.uid);
      }}
    >
      <Image
        source={{
          uri: item.avatarUrl || "https://via.placeholder.com/50",
        }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        {item.bio && (
          <Text style={styles.userBio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPostResult = ({ item }: { item: PostResult }) => (
    <TouchableOpacity
      style={styles.postResult}
      onPress={() => {
        // Navigate to post detail
        console.log("Navigate to post:", item.id);
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      <View style={styles.postInfo}>
        <Text style={styles.postCaption} numberOfLines={2}>
          {item.caption || "No caption"}
        </Text>
        <Text style={styles.postUser}>by {item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users and posts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : hasSearched ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={() => (
            <View>
              {/* Users Section */}
              {userResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Users</Text>
                  <FlatList
                    data={userResults}
                    renderItem={renderUserResult}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.usersList}
                  />
                </View>
              )}

              {/* Posts Section */}
              {postResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Posts</Text>
                  <FlatList
                    data={postResults}
                    renderItem={renderPostResult}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.postsGrid}
                  />
                </View>
              )}

              {/* No Results */}
              {userResults.length === 0 && postResults.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    No results found for "{searchQuery}"
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <View style={styles.initialState}>
          <Text style={styles.initialText}>Start typing to search</Text>
        </View>
      )}
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
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  comingSoon: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  usersList: {
    paddingVertical: 10,
  },
  userResult: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginRight: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    minWidth: 120,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
  },
  userBio: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  postsGrid: {
    paddingBottom: 20,
  },
  postResult: {
    flex: 1,
    margin: 5,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    overflow: "hidden",
  },
  postImage: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },
  postInfo: {
    padding: 10,
  },
  postCaption: {
    fontSize: 14,
    marginBottom: 5,
  },
  postUser: {
    fontSize: 12,
    color: "#666",
  },
  noResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  noResultsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  initialState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  initialText: {
    fontSize: 16,
    color: "#999",
  },
});

export default SearchScreen;
