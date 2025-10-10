import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import timeFormat from "../config/timeFormat";

type PostDetailScreenRouteProp = RouteProp<RootStackParamList, "PostDetail">;
type PostDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "PostDetail"
>;

interface Post {
  id: string;
  imageUrl: string;
  caption?: string;
  userId: string;
  createdAt: any;
  likesCount?: number;
  commentsCount?: number;
  likedByUsers?: string[];
  username?: string;
  userAvatar?: string;
}

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  createdAt: any;
}

const { width } = Dimensions.get("window");

const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailScreenRouteProp>();
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const { user } = useAuth();

  const postId = route.params?.postId;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Load post data
  useEffect(() => {
    if (!postId) return;

    const postUnsub = onSnapshot(doc(db, "posts", postId), (snap) => {
      if (snap.exists()) {
        const postData = { id: snap.id, ...snap.data() } as Post;
        setPost(postData);
        setIsLiked(
          (user && postData.likedByUsers?.includes(user.uid)) || false
        );
        setLikesCount(postData.likesCount || 0);
      }
      setLoading(false);
    });

    return () => postUnsub();
  }, [postId, user]);

  // Load comments
  useEffect(() => {
    if (!postId) return;

    const commentsUnsub = onSnapshot(
      collection(db, "posts", postId, "comments"),
      (snapshot) => {
        const commentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Comment[];
        setComments(
          commentsData.sort(
            (a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.() || 0
          )
        );
      }
    );

    return () => commentsUnsub();
  }, [postId]);

  const handleLikeToggle = async () => {
    if (!user || !post) return;

    const postRef = doc(db, "posts", post.id);
    const alreadyLiked = post.likedByUsers?.includes(user.uid);

    try {
      if (alreadyLiked) {
        await updateDoc(postRef, {
          likedByUsers: arrayRemove(user.uid),
          likesCount: increment(-1),
        });
        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        await updateDoc(postRef, {
          likedByUsers: arrayUnion(user.uid),
          likesCount: increment(1),
        });

        // Create notification
        if (post.userId !== user.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: post.userId,
            fromUserId: user.uid,
            type: "like",
            postId: post.id,
            postCaption: post.caption,
            createdAt: serverTimestamp(),
            read: false,
          });
        }

        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      Alert.alert("Error", "Failed to update like");
    }
  };

  const handleDeletePost = async () => {
    if (!post || !user || post.userId !== user.uid) return;

    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "posts", post.id));
            navigation.goBack();
          } catch (err) {
            console.error("Error deleting post:", err);
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!user || (comment.authorId !== user.uid && post?.userId !== user.uid))
      return;

    try {
      await deleteDoc(doc(db, "posts", postId!, "comments", comment.id));
      await updateDoc(doc(db, "posts", postId!), {
        commentsCount: increment(-1),
      });
    } catch (err) {
      console.error("Error deleting comment:", err);
      Alert.alert("Error", "Failed to delete comment");
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading post...</Text>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text>Post not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 18, color: "#007AFF" }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600", marginLeft: 20 }}>
          Post
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Post Content */}
        <View style={{ padding: 15 }}>
          {/* Post Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Image
              source={{
                uri: post.userAvatar || "https://via.placeholder.com/40",
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginRight: 10,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", fontSize: 16 }}>
                {post.username || "Unknown User"}
              </Text>
              <Text style={{ color: "#666", fontSize: 12 }}>
                {post.createdAt?.toDate
                  ? timeFormat(post.createdAt.toDate())
                  : "Just now"}
              </Text>
            </View>
            {user && user.uid === post.userId && (
              <TouchableOpacity onPress={handleDeletePost}>
                <Text style={{ fontSize: 20, color: "#666" }}>⋯</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Post Image */}
          <Image
            source={{ uri: post.imageUrl }}
            style={{
              width: width - 30,
              height: width - 30,
              borderRadius: 10,
              marginBottom: 15,
            }}
            resizeMode="cover"
          />

          {/* Post Caption */}
          {post.caption && (
            <Text style={{ fontSize: 16, lineHeight: 22, marginBottom: 15 }}>
              {post.caption}
            </Text>
          )}

          {/* Actions */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <TouchableOpacity
              onPress={handleLikeToggle}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: 20,
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 5 }}>
                {isLiked ? "❤️" : "🤍"}
              </Text>
              <Text style={{ fontSize: 16 }}>{likesCount}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 24, marginRight: 5 }}>💬</Text>
              <Text style={{ fontSize: 16 }}>{comments.length}</Text>
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#eee",
            paddingHorizontal: 15,
            paddingTop: 15,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 15 }}>
            Comments ({comments.length})
          </Text>

          {comments.length === 0 ? (
            <Text
              style={{
                color: "#666",
                textAlign: "center",
                paddingVertical: 20,
              }}
            >
              No comments yet. Be the first to comment!
            </Text>
          ) : (
            comments.map((comment) => (
              <View
                key={comment.id}
                style={{
                  flexDirection: "row",
                  marginBottom: 15,
                  paddingBottom: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f0f0f0",
                }}
              >
                <Image
                  source={{
                    uri:
                      comment.authorAvatar || "https://via.placeholder.com/32",
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    marginRight: 10,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 5,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        fontSize: 14,
                        marginRight: 10,
                      }}
                    >
                      {comment.authorUsername}
                    </Text>
                    <Text style={{ color: "#666", fontSize: 12 }}>
                      {comment.createdAt?.toDate
                        ? timeFormat(comment.createdAt.toDate())
                        : "Just now"}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, lineHeight: 20 }}>
                    {comment.text}
                  </Text>
                </View>
                {user &&
                  (user.uid === comment.authorId ||
                    user.uid === post.userId) && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(comment)}
                      style={{ padding: 5 }}
                    >
                      <Text style={{ color: "#666", fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PostDetailScreen;
