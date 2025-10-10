// Editor refresh: no-op comment to nudge diagnostics
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
  useWindowDimensions,
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
import { useTheme } from "../contexts/ThemeContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import CommentList from "../components/CommentList";
import CommentInput from "../components/CommentInput";
import LikesListModal from "../components/LikesListModal";
import FollowListModal from "../components/FollowListModal";
import EditProfileModal from "../components/EditProfileModal";
import timeFormat from "../config/timeFormat";

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "UserProfile">;
type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "UserProfile"
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
const HORIZONTAL_PADDING = 20; // match profile header padding
const GRID_GAP = 8;
const imageSize = Math.floor(
  (width - HORIZONTAL_PADDING * 2 - GRID_GAP * (numColumns - 1)) / numColumns
);

const ProfileScreen: React.FC = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user: authUser } = useAuth();
  const { colors } = useTheme();
  const windowDims = useWindowDimensions();

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
  const [isUpdatingLike, setIsUpdatingLike] = useState(false);

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
      if (isUpdatingLike) return;
      setIsUpdatingLike(true);
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
    } finally {
      setIsUpdatingLike(false);
    }
  };

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={{
        width: imageSize,
        height: imageSize,
        marginRight: GRID_GAP,
        marginBottom: GRID_GAP,
        borderRadius: 8,
        overflow: "hidden",
      }}
      onPress={() => setSelectedPost(item)}
    >
      <Image
        source={
          item.imageUrl
            ? { uri: item.imageUrl }
            : require("../../assets/placeholderImg.jpg")
        }
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  if (loadingProfile || loadingPosts) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgPrimary,
        }}
      >
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (errorProfile) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgPrimary,
        }}
      >
        <Text style={{ color: colors.danger }}>Error: {errorProfile}</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgPrimary,
        }}
      >
        <Text style={{ color: colors.textPrimary }}>Profile not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {/* Back Button Header - Only show when navigating to another user's profile */}
      {route.params?.userId && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 15,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderColor,
            backgroundColor: colors.bgPrimary,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              padding: 8,
              marginRight: 15,
            }}
          >
            <Text style={{ fontSize: 18, color: colors.brandPrimary }}>
              ← Back
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.textPrimary,
            }}
          >
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
          {profileData.avatarUrl ? (
            <Image
              source={{ uri: profileData.avatarUrl }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                marginRight: 20,
              }}
            />
          ) : (
            <Image
              source={require("../../assets/placeholderImg.jpg")}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                marginRight: 20,
              }}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 5,
                color: colors.textPrimary,
              }}
            >
              {profileData.username || "No Username"}
            </Text>
            {profileData.displayName && (
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  marginBottom: 10,
                }}
              >
                {profileData.displayName}
              </Text>
            )}
            {isOwnProfile ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.bgSecondary,
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  onPress={() => setShowEditModal(true)}
                >
                  <Text
                    style={{ fontWeight: "600", color: colors.textPrimary }}
                  >
                    Edit Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.bgSecondary,
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  onPress={() => navigation.navigate("Settings")}
                >
                  <Text
                    style={{ fontWeight: "600", color: colors.textPrimary }}
                  >
                    ⚙️
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: isFollowing
                      ? colors.bgSecondary
                      : colors.brandPrimary,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 6,
                    maxWidth: 130,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={handleFollowToggle}
                  disabled={loadingFollow}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      color: isFollowing
                        ? colors.textPrimary
                        : colors.bgPrimary,
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
              </View>
            )}
          </View>
        </View>

        {/* Bio */}
        {profileData.bio && (
          <Text
            style={{
              marginBottom: 15,
              lineHeight: 20,
              color: colors.textPrimary,
            }}
          >
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
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: colors.textPrimary,
              }}
            >
              {profilePosts.length}
            </Text>
            <Text style={{ color: colors.textSecondary }}>Posts</Text>
          </View>
          <TouchableOpacity
            style={{ alignItems: "center" }}
            onPress={() => setModalType("followers")}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: colors.textPrimary,
              }}
            >
              {profileData.followersCount || 0}
            </Text>
            <Text style={{ color: colors.textSecondary }}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ alignItems: "center" }}
            onPress={() => setModalType("following")}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: colors.textPrimary,
              }}
            >
              {profileData.followingCount || 0}
            </Text>
            <Text style={{ color: colors.textSecondary }}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts Grid */}
      <FlatList
        data={profilePosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={{
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingTop: 6,
          paddingBottom: 20,
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: 50 }}>
            <Text style={{ color: colors.textSecondary }}>No posts yet.</Text>
          </View>
        }
      />

      {/* Post Detail Modal - full image with bottom sheet */}
      {selectedPost && (
        <Modal
          visible={!!selectedPost}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedPost(null)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
            <TouchableOpacity
              accessibilityLabel="Close post"
              onPress={() => setSelectedPost(null)}
              style={{
                position: "absolute",
                top: 30,
                right: 12,
                zIndex: 30,
                backgroundColor: "rgba(255,255,255,0.95)",
                width: 36,
                height: 36,
                borderRadius: 18,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 6,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 20 }}>×</Text>
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={
                  selectedPost?.imageUrl
                    ? { uri: selectedPost.imageUrl }
                    : require("../../assets/placeholderImg.jpg")
                }
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>

            <View
              style={{
                width: "100%",
                backgroundColor: colors.bgPrimary,
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
                paddingTop: 10,
                paddingHorizontal: 12,
                maxHeight: windowDims.height * 0.45,
                position: "absolute",
                bottom: 0,
                left: 0,
              }}
            >
              <SafeAreaView style={{ flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.borderLight,
                    alignSelf: "center",
                    marginBottom: 10,
                  }}
                />

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  {postUserData?.avatarUrl ? (
                    <Image
                      source={{ uri: postUserData.avatarUrl }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        marginRight: 10,
                      }}
                    />
                  ) : (
                    <Image
                      source={require("../../assets/placeholderImg.jpg")}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        marginRight: 10,
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontWeight: "700", color: colors.textPrimary }}
                    >
                      {postUserData?.username || "Unknown"}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {timeFormat(selectedPost?.createdAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      selectedPost && handleLikeToggle(selectedPost)
                    }
                    style={{ padding: 8 }}
                  >
                    <Text style={{ fontSize: 18 }}>🐾</Text>
                  </TouchableOpacity>
                </View>

                {selectedPost?.caption ? (
                  <Text style={{ marginBottom: 8, color: colors.textPrimary }}>
                    {selectedPost.caption}
                  </Text>
                ) : null}

                <View style={{ flex: 1, marginBottom: 6 }}>
                  <CommentList
                    postId={selectedPost!.id}
                    currentUser={authUser}
                    isPostOwner={selectedPost!.userId === authUser?.uid}
                    post={selectedPost!}
                  />
                </View>

                <CommentInput
                  postId={selectedPost!.id}
                  currentUser={authUser}
                  post={selectedPost!}
                />
              </SafeAreaView>
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
