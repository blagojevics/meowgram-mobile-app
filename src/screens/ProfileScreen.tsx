import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  where,
  deleteDoc,
  setDoc,
  increment,
  serverTimestamp,
  updateDoc,
  addDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import CommentList from "../components/CommentList";
import CommentInput from "../components/CommentInput";
import LikesListModal from "../components/LikesListModal";
import FollowListModal from "../components/FollowListModal";
import EditProfileModal from "../components/EditProfileModal";
import timeFormat from "../config/timeFormat";

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "Profile">;
type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Profile"
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
}

interface UserProfile {
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

const { width } = Dimensions.get("window");
const numColumns = 3;
const imageSize = (width - 40) / numColumns - 10;

const ProfileScreen: React.FC = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user: authUser } = useAuth();

  const userId = route.params?.userId || authUser?.uid;
  const isOwnProfile = authUser && authUser.uid === userId;

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalType, setModalType] = useState<"followers" | "following" | null>(
    null
  );
  const [postUserData, setPostUserData] = useState<UserProfile | null>(null);
  const [showLikesModal, setShowLikesModal] = useState(false);

  // Load user profile data
  useEffect(() => {
    if (!userId) return;
    setLoadingProfile(true);
    const userDocRef = doc(db, "users", userId);
    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          setProfileData(snap.data() as UserProfile);
          setErrorProfile(null);
        } else {
          setErrorProfile("User Profile not found.");
        }
        setLoadingProfile(false);
      },
      () => {
        setErrorProfile("Failed to load user profile");
        setLoadingProfile(false);
      }
    );
    return () => unsub();
  }, [userId]);

  // Load user posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      setLoadingPosts(true);
      setErrorPosts(null);
      try {
        const postsCollectionRef = collection(db, "posts");
        const q = query(
          postsCollectionRef,
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const postsArray = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];
        setProfilePosts(postsArray);
      } catch (err) {
        console.error("Error loading posts:", err);
        setErrorPosts("Failed to load posts.");
      } finally {
        setLoadingPosts(false);
      }
    };
    if (userId) fetchUserPosts();
  }, [userId]);

  // Check if current user is following this profile
  useEffect(() => {
    if (!authUser || isOwnProfile) {
      setIsFollowing(false);
      return;
    }
    const followDocRef = doc(db, "users", authUser.uid!, "following", userId!);
    const unsub = onSnapshot(followDocRef, (snap) => {
      setIsFollowing(snap.exists());
    });
    return () => unsub();
  }, [authUser, userId, isOwnProfile]);

  // Load post user data when a post is selected
  useEffect(() => {
    if (!selectedPost) return;
    const unsubPost = onSnapshot(doc(db, "posts", selectedPost.id), (snap) => {
      if (snap.exists()) {
        setSelectedPost({ id: snap.id, ...snap.data() } as Post);
      }
    });
    const unsubUser = onSnapshot(
      doc(db, "users", selectedPost.userId),
      (snap) => {
        if (snap.exists()) {
          setPostUserData(snap.data() as UserProfile);
        }
      }
    );
    return () => {
      unsubPost();
      unsubUser();
    };
  }, [selectedPost]);

  const handleFollowToggle = async () => {
    if (!authUser || isOwnProfile || loadingFollow || !authUser.uid || !userId)
      return;
    setLoadingFollow(true);
    const currentUserRef = doc(db, "users", authUser.uid);
    const targetUserRef = doc(db, "users", userId);
    const followingRef = doc(db, "users", authUser.uid, "following", userId);
    const followerRef = doc(db, "users", userId, "followers", authUser.uid);
    try {
      if (isFollowing) {
        await deleteDoc(followingRef);
        await deleteDoc(followerRef);
        await updateDoc(currentUserRef, { followingCount: increment(-1) });
        await updateDoc(targetUserRef, { followersCount: increment(-1) });
      } else {
        await setDoc(followingRef, {
          uid: userId,
          username: profileData?.username,
          avatarUrl: profileData?.avatarUrl,
          followedAt: new Date(),
        });
        await setDoc(followerRef, {
          uid: authUser.uid,
          username: authUser.displayName || authUser.email,
          avatarUrl: "",
          followedAt: new Date(),
        });
        await updateDoc(currentUserRef, { followingCount: increment(1) });
        await updateDoc(targetUserRef, { followersCount: increment(1) });
        if (userId !== authUser.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: userId,
            fromUserId: authUser.uid,
            type: "follow",
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      }
    } catch (err) {
      console.error("Follow/unfollow error:", err);
      Alert.alert("Error", "Failed to update follow status");
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleLikeToggle = async (post: Post) => {
    if (!authUser) return;
    const postRef = doc(db, "posts", post.id);
    const alreadyLiked = post.likedByUsers?.includes(authUser.uid);
    try {
      if (alreadyLiked) {
        await updateDoc(postRef, {
          likedByUsers: arrayRemove(authUser.uid),
          likesCount: increment(-1),
        });
      } else {
        await updateDoc(postRef, {
          likedByUsers: arrayUnion(authUser.uid),
          likesCount: increment(1),
        });
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={{
        width: imageSize,
        height: imageSize,
        margin: 5,
        borderRadius: 8,
        overflow: "hidden",
      }}
      onPress={() => setSelectedPost(item)}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  if (loadingProfile || loadingPosts) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  if (errorProfile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>Error: {errorProfile}</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Profile not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Back Button Header - Only show when navigating to another user's profile */}
      {route.params?.userId && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 15,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              padding: 8,
              marginRight: 15,
            }}
          >
            <Text style={{ fontSize: 18, color: "#007AFF" }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>
            {profileData.username || "Profile"}
          </Text>
        </View>
      )}

      {/* Profile Header */}
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Image
            source={{
              uri: profileData.avatarUrl || "https://via.placeholder.com/100",
            }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              marginRight: 20,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 5 }}>
              {profileData.username || "No Username"}
            </Text>
            {profileData.displayName && (
              <Text style={{ fontSize: 16, color: "#666", marginBottom: 10 }}>
                {profileData.displayName}
              </Text>
            )}
            {isOwnProfile ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#f0f0f0",
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  onPress={() => setShowEditModal(true)}
                >
                  <Text style={{ fontWeight: "600" }}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#f0f0f0",
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  onPress={() => navigation.navigate("Settings")}
                >
                  <Text style={{ fontWeight: "600" }}>⚙️</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: isFollowing ? "#f0f0f0" : "#007AFF",
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 6,
                }}
                onPress={handleFollowToggle}
                disabled={loadingFollow}
              >
                <Text
                  style={{
                    color: isFollowing ? "#000" : "#fff",
                    fontWeight: "600",
                  }}
                >
                  {loadingFollow
                    ? "Loading..."
                    : isFollowing
                    ? "Following"
                    : "Follow"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bio */}
        {profileData.bio && (
          <Text style={{ marginBottom: 15, lineHeight: 20 }}>
            {profileData.bio.split("\n").map((line, index) => (
              <Text key={index}>
                {line}
                {"\n"}
              </Text>
            ))}
          </Text>
        )}

        {/* Stats */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            style={{ alignItems: "center" }}
            onPress={() => setModalType("followers")}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              {profileData.followersCount || 0}
            </Text>
            <Text style={{ color: "#666" }}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ alignItems: "center" }}
            onPress={() => setModalType("following")}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              {profileData.followingCount || 0}
            </Text>
            <Text style={{ color: "#666" }}>Following</Text>
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              {profilePosts.length}
            </Text>
            <Text style={{ color: "#666" }}>Posts</Text>
          </View>
        </View>
      </View>

      {/* Posts Grid */}
      <FlatList
        data={profilePosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={{ padding: 10 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: 50 }}>
            <Text style={{ color: "#666" }}>No posts yet.</Text>
          </View>
        }
      />

      {/* Post Detail Modal */}
      {selectedPost && (
        <Modal
          visible={!!selectedPost}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedPost(null)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)" }}>
            <TouchableOpacity
              style={{ position: "absolute", top: 50, right: 20, zIndex: 10 }}
              onPress={() => setSelectedPost(null)}
            >
              <Text style={{ color: "white", fontSize: 24 }}>✕</Text>
            </TouchableOpacity>

            <View style={{ flex: 1, flexDirection: "row" }}>
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  source={{ uri: selectedPost.imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>

              <View
                style={{
                  width: 300,
                  backgroundColor: "#fff",
                  padding: 15,
                  flexDirection: "column",
                }}
              >
                {/* Post Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <Image
                    source={{
                      uri:
                        postUserData?.avatarUrl ||
                        "https://via.placeholder.com/40",
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 10,
                    }}
                  />
                  <Text style={{ fontWeight: "bold" }}>
                    {postUserData?.username || "Unknown"}
                  </Text>
                </View>

                {/* Caption */}
                {selectedPost.caption && (
                  <Text style={{ marginBottom: 15 }}>
                    {selectedPost.caption}
                  </Text>
                )}

                {/* Comments */}
                <View style={{ flex: 1 }}>
                  <CommentList
                    postId={selectedPost.id}
                    currentUser={authUser}
                    isPostOwner={selectedPost.userId === authUser?.uid}
                    post={selectedPost}
                  />
                </View>

                {/* Comment Input */}
                <CommentInput
                  postId={selectedPost.id}
                  currentUser={authUser}
                  post={selectedPost}
                />

                {/* Actions */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleLikeToggle(selectedPost)}
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 18, marginRight: 5 }}>🐾</Text>
                    <Text>{selectedPost.likesCount || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowLikesModal(true)}
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <Text>View Likes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modals */}
      {showEditModal && (
        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          currentUser={profileData}
          onProfileUpdate={(updatedProfile: UserProfile) => {
            setProfileData(updatedProfile);
            setShowEditModal(false);
          }}
        />
      )}

      {modalType && userId && (
        <FollowListModal
          visible={!!modalType}
          onClose={() => setModalType(null)}
          userId={userId}
          type={modalType}
        />
      )}

      {showLikesModal && selectedPost && (
        <LikesListModal
          isOpen={showLikesModal}
          onClose={() => setShowLikesModal(false)}
          likedByUsers={selectedPost.likedByUsers || []}
        />
      )}
    </SafeAreaView>
  );
};

export default ProfileScreen;
