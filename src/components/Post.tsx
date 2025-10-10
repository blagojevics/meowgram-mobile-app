import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Clipboard,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import {
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import formatTimeAgo from "../config/timeFormat";
import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import CommentsModal from "./CommentsModal";
import LikesListModal from "./LikesListModal";

const { width, height } = Dimensions.get("window");

type PostType = {
  id: string;
  caption?: string;
  imageUrl?: string;
  userId: string;
  createdAt: any;
  likesCount: number;
  likedByUsers: string[];
  commentsCount: number;
};

type UserType = {
  uid: string;
  username: string;
  avatarUrl?: string;
  photoURL?: string;
};

type CommentType = {
  id: string;
  authorId: string;
  text: string;
  createdAt: any;
};

interface PostProps {
  post: PostType;
  currentUser: UserType | null;
  onPostActionComplete?: (action: {
    type: string;
    postId: string;
    newCaption?: string;
  }) => void;
  isFullScreen?: boolean;
}

export default function Post({
  post,
  currentUser,
  onPostActionComplete,
  isFullScreen,
}: PostProps) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [isLiked, setIsLiked] = useState(
    currentUser &&
      post.likedByUsers &&
      post.likedByUsers.includes(currentUser.uid)
  );
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption || "");
  const [editingError, setEditingError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastTapTime = useRef(0);
  const likeAnimation = useRef(new Animated.Value(0)).current;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [previewComments, setPreviewComments] = useState<CommentType[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [showFullComments, setShowFullComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);

  const [postUser, setPostUser] = useState<UserType | null>(null);

  useEffect(() => {
    setEditedCaption(post.caption || "");
    setIsLiked(
      currentUser &&
        post.likedByUsers &&
        post.likedByUsers.includes(currentUser.uid)
    );
    setLikesCount(post.likesCount || 0);
  }, [post, currentUser]);

  useEffect(() => {
    if (!post.userId) return;
    const ref = doc(db, "users", post.userId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setPostUser(snap.data() as UserType);
      }
    });
    return () => unsub();
  }, [post.userId]);

  const handleLike = async () => {
    if (!currentUser) return;
    const postDocRef = doc(db, "posts", post.id);
    const userId = currentUser.uid;
    try {
      if (isLiked) {
        await updateDoc(postDocRef, {
          likesCount: increment(-1),
          likedByUsers: arrayRemove(userId),
        });
        setLikesCount((prev) => prev - 1);
        setIsLiked(false);
      } else {
        await updateDoc(postDocRef, {
          likesCount: increment(1),
          likedByUsers: arrayUnion(userId),
        });
        setLikesCount((prev) => prev + 1);
        setIsLiked(true);
        if (post.userId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: post.userId,
            fromUserId: currentUser.uid,
            type: "like",
            postId: post.id,
            postCaption: post.caption,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      }
    } catch (err) {
      console.error("Error updating like:", err);
    }
  };

  const handleDoubleTap = () => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime.current;
    if (tapLength < 500 && tapLength > 0) {
      if (!isLiked) {
        handleLike();
        Animated.timing(likeAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          likeAnimation.setValue(0);
        });
      }
    }
    lastTapTime.current = currentTime;
  };

  const handleCopyLink = async () => {
    try {
      const postUrl = `meowgram://post/${post.id}`; // Adjust for deep linking
      await Clipboard.setString(postUrl);
      Alert.alert("Link copied", "Post link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setShowOptions(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCaption(post.caption || "");
    setEditingError(null);
  };

  const handleEditedCaptionChange = (text: string) => {
    setEditedCaption(text);
  };

  const handleSaveEdit = async () => {
    setEditingError(null);
    if (editedCaption.trim() === "") {
      setEditingError("Caption cannot be empty.");
      return;
    }
    if (editedCaption === post.caption) {
      setIsEditing(false);
      return;
    }
    try {
      const postDocRef = doc(db, "posts", post.id);
      await updateDoc(postDocRef, { caption: editedCaption });
      if (onPostActionComplete) {
        onPostActionComplete({
          type: "edit",
          postId: post.id,
          newCaption: editedCaption,
        });
      }
      setIsEditing(false);
    } catch (err) {
      setEditingError((err as Error).message || "Failed to update caption.");
    }
  };

  const handleDeletePost = () => {
    setShowDeleteConfirm(true);
    setShowOptions(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    try {
      const postDocRef = doc(db, "posts", post.id);
      await deleteDoc(postDocRef);
      if (onPostActionComplete) {
        onPostActionComplete({ type: "delete", postId: post.id });
      }
    } catch (err) {
      console.error("Error deleting post:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("postId", "==", post.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt || { toDate: () => new Date(0) },
        } as CommentType;
      });
      setTotalComments(all.length);
      setPreviewComments(all.slice(0, all.length < 10 ? 1 : 2));
    });
    return () => unsub();
  }, [post.id]);

  const handleDeleteComment = async (comment: CommentType) => {
    if (
      post.userId === currentUser?.uid ||
      comment.authorId === currentUser?.uid
    ) {
      await deleteDoc(doc(db, "comments", comment.id));
      await updateDoc(doc(db, "posts", post.id), {
        commentsCount: increment(-1),
      });
    }
  };

  const scale = likeAnimation.interpolate({
    inputRange: [0, 0.15, 0.3, 0.45, 0.8, 1],
    outputRange: [0, 1.2, 0.95, 1, 1, 0],
  });

  const opacity = likeAnimation.interpolate({
    inputRange: [0, 0.15, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View
      style={[
        styles.postCard,
        { backgroundColor: colors.bgSecondary },
        isFullScreen && styles.postCardFullscreen,
      ]}
    >
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.postHeaderUserLink}
          onPress={() =>
            (navigation as any).navigate("UserProfile", { userId: post.userId })
          }
        >
          {postUser?.avatarUrl || postUser?.photoURL ? (
            <Image
              source={{ uri: postUser?.avatarUrl || postUser?.photoURL }}
              style={[
                styles.postHeaderAvatar,
                { borderColor: colors.borderColor },
              ]}
            />
          ) : (
            <Image
              source={require("../../assets/placeholderImg.jpg")}
              style={[
                styles.postHeaderAvatar,
                { borderColor: colors.borderColor },
              ]}
            />
          )}
          <Text
            style={[styles.postUsernameHeader, { color: colors.textPrimary }]}
          >
            {postUser?.username || "Unknown User"}
          </Text>
          <Text style={[styles.postTime, { color: colors.textSecondary }]}>
            ·{" "}
            {post.createdAt?.toDate
              ? formatTimeAgo(post.createdAt.toDate())
              : "just now"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCopyLink} style={styles.copyLinkBtn}>
          <Text>🔗</Text>
        </TouchableOpacity>
        {currentUser && currentUser.uid === post.userId && (
          <TouchableOpacity onPress={() => setShowOptions(!showOptions)}>
            <Text style={styles.optionsText}>•••</Text>
          </TouchableOpacity>
        )}
        {showOptions && (
          <TouchableWithoutFeedback onPress={() => setShowOptions(false)}>
            <View style={styles.optionsOverlay}>
              <View
                style={[
                  styles.postOptionsMenu,
                  {
                    backgroundColor: colors.bgPrimary,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <TouchableOpacity onPress={handleCopyLink}>
                  <Text style={{ color: colors.textPrimary }}>Copy Link</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleEditClick}>
                  <Text style={{ color: colors.textPrimary }}>
                    Edit Description
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeletePost}
                  disabled={isDeleting}
                >
                  <Text style={{ color: colors.danger }}>
                    {isDeleting ? "Deleting..." : "Delete Post"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>

      <TouchableOpacity
        style={styles.postImageContainer}
        onPress={() =>
          (navigation as any).navigate("PostDetail", { postId: post.id })
        }
      >
        <Image
          source={
            post.imageUrl
              ? { uri: post.imageUrl }
              : require("../../assets/placeholderImg.jpg")
          }
          style={styles.postImage}
          resizeMode="cover"
        />
        <Animated.View
          style={[
            styles.likeAnimation,
            {
              transform: [{ translateX: -40 }, { translateY: -40 }, { scale }],
              opacity,
            },
          ]}
        >
          <FontAwesome name="paw" size={80} color="#e74c3c" />
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.postActions}>
        <TouchableOpacity onPress={handleLike} style={styles.postActionButton}>
          <FontAwesome
            name="paw"
            size={22}
            color={isLiked ? colors.brandSecondary : "gray"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowLikes(true)}
          style={styles.postLikesCount}
        >
          <Text style={{ color: colors.textSecondary }}>{likesCount} Paws</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowFullComments(true)}
          style={styles.postActionButton}
        >
          <FontAwesome name="comment" size={20} color="gray" />
        </TouchableOpacity>
        <Text
          style={[styles.postCommentsCount, { color: colors.textSecondary }]}
        >
          {post.commentsCount || 0}
        </Text>
      </View>

      <View style={styles.postCaption}>
        {isEditing ? (
          <View>
            <TextInput
              value={editedCaption}
              onChangeText={handleEditedCaptionChange}
              multiline
              numberOfLines={3}
              style={styles.captionInput}
            />
            {editingError && (
              <Text style={{ color: "red" }}>{editingError}</Text>
            )}
            <View style={styles.editButtons}>
              <TouchableOpacity onPress={handleSaveEdit}>
                <Text>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.captionLeft}>
            <Text
              style={[
                styles.postCaptionUsername,
                { color: colors.brandPrimary },
              ]}
            >
              {postUser?.username + " •" || "Unknown User"}
            </Text>
            <Text
              style={[styles.postCaptionText, { color: colors.textPrimary }]}
            >
              {post.caption || "No caption."}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.postCommentSection}>
        {previewComments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            currentUser={currentUser}
            isPostOwner={post.userId === currentUser?.uid}
            onDelete={handleDeleteComment}
            post={post}
          />
        ))}

        {totalComments > previewComments.length && (
          <TouchableOpacity
            onPress={() => setShowFullComments(true)}
            style={styles.showMoreCommentsBtn}
          >
            <Text style={{ color: colors.textSecondary }}>
              Show more comments
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showFullComments && (
        <CommentsModal
          isOpen={showFullComments}
          onClose={() => setShowFullComments(false)}
          postId={post.id}
          currentUser={currentUser}
          isPostOwner={post.userId === currentUser?.uid}
          post={post}
        />
      )}

      {showLikes && (
        <LikesListModal
          isOpen={showLikes}
          onClose={() => setShowLikes(false)}
          likedByUsers={post.likedByUsers || []}
        />
      )}

      {currentUser ? (
        <CommentInput post={post} postId={post.id} currentUser={currentUser} />
      ) : (
        <Text style={styles.loginPrompt}>Log in to comment</Text>
      )}

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.deleteConfirmModal}>
          <View
            style={[
              styles.deleteConfirmContent,
              { backgroundColor: colors.bgPrimary },
            ]}
          >
            <Text style={[styles.deleteTitle, { color: colors.textPrimary }]}>
              Delete Post?
            </Text>
            <Text style={[styles.deleteText, { color: colors.textSecondary }]}>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </Text>
            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                style={[styles.cancelBtn, { borderColor: colors.borderColor }]}
              >
                <Text style={{ color: colors.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                style={[
                  styles.confirmDeleteBtn,
                  { backgroundColor: colors.danger },
                ]}
                disabled={isDeleting}
              >
                <Text style={{ color: colors.bgPrimary }}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  postCard: {
    width: "100%",
    minHeight: 400,
    borderRadius: 12,
    flexDirection: "column" as "column",
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  postCardFullscreen: {
    width: width * 0.95,
    maxWidth: 600,
    height: height * 0.95,
  },
  postHeader: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    justifyContent: "space-between" as "space-between",
    marginBottom: 4,
  },
  postHeaderUserLink: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
  },
  postHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
  },
  postUsernameHeader: {
    fontWeight: "500" as "500",
    marginLeft: 10,
  },
  postTime: {
    fontSize: 12,
    marginLeft: 5,
  },
  copyLinkBtn: {
    padding: 4,
  },
  postOptionsTrigger: {
    fontSize: 20,
  },
  optionsOverlay: {
    position: "absolute" as "absolute",
    top: 60,
    right: 20,
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    zIndex: 10,
  },
  postOptionsMenu: {
    // styles
  },
  postImageContainer: {
    width: "100%",
    height: 400,
    alignSelf: "center" as "center",
    position: "relative" as "relative",
    overflow: "hidden" as "hidden",
    borderRadius: 5,
    marginVertical: 4,
  },
  postImage: {
    width: "100%",
    height: "100%",
    alignSelf: "center",
  },
  likeAnimation: {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
  },
  postActions: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginVertical: 3,
  },
  postActionButton: {
    marginRight: 6,
    padding: 4,
  },
  postLikesCount: {
    fontSize: 14,
    marginRight: 6,
  },
  postCommentsCount: {
    fontSize: 14,
  },
  postCaption: {
    marginVertical: 2,
    // prevent caption text from overflowing the card
    paddingHorizontal: 4,
  },
  captionLeft: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
  },
  postCaptionUsername: {
    fontWeight: "500" as "500",
    marginRight: 5,
  },
  postCaptionText: {
    fontSize: 14,
    flexShrink: 1,
    flexWrap: "wrap" as "wrap",
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    minHeight: 60,
  },
  editButtons: {
    flexDirection: "row" as "row",
    justifyContent: "space-between" as "space-between",
    marginTop: 10,
  },
  postCommentSection: {
    marginVertical: 4,
  },
  showMoreCommentsBtn: {
    fontSize: 12,
    marginTop: -5,
  },
  comment: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginBottom: 5,
  },
  commentInput: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginTop: 10,
  },
  loginPrompt: {
    fontSize: 12,
    textAlign: "center" as "center",
    marginVertical: 10,
  },
  deleteConfirmModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
  },
  deleteConfirmContent: {
    padding: 20,
    borderRadius: 8,
    maxWidth: 400,
    width: "90%",
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: "bold" as "bold",
    marginBottom: 10,
  },
  deleteText: {
    fontSize: 14,
    marginBottom: 20,
  },
  deleteConfirmActions: {
    flexDirection: "row" as "row",
    justifyContent: "space-between" as "space-between",
  },
  cancelBtn: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 4,
  },
  confirmDeleteBtn: {
    padding: 10,
    borderRadius: 4,
  },
  likeHeart: {
    fontSize: 80,
  },
  actionIcon: {
    fontSize: 24,
  },
  optionsText: {
    fontSize: 20,
  },
});
