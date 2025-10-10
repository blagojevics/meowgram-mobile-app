import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

interface CommentItemProps {
  comment: any;
  currentUser: any;
  isPostOwner: boolean;
  onDelete: (comment: any) => void;
  post: any;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUser,
  isPostOwner,
  onDelete,
  post,
}) => {
  const [author, setAuthor] = useState<any>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState<any>(null);

  // Use optimistic likes if available, otherwise use comment.likes
  const commentLikes =
    optimisticLikes !== null ? optimisticLikes : comment.likes || [];
  const hasLiked = commentLikes.includes(currentUser?.uid);
  const likesCount = commentLikes.length;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", comment.authorId), (snap) => {
      setAuthor(snap.data());
    });
    return unsub;
  }, [comment.authorId]);

  // Reset optimistic state when comment data changes from Firestore
  useEffect(() => {
    setOptimisticLikes(null);
  }, [comment.likes]);

  const handleLike = async () => {
    if (!currentUser?.uid || isLiking) return;

    setIsLiking(true);

    // Get current state for optimistic update
    const currentLikes = comment.likes || [];
    const wasLiked = currentLikes.includes(currentUser.uid);

    // Immediate optimistic update
    if (wasLiked) {
      setOptimisticLikes(
        currentLikes.filter((uid: string) => uid !== currentUser.uid)
      );
    } else {
      setOptimisticLikes([...currentLikes, currentUser.uid]);
    }

    try {
      const commentRef = doc(db, "comments", comment.id);

      if (wasLiked) {
        // Unlike the comment
        await updateDoc(commentRef, {
          likes: arrayRemove(currentUser.uid),
        });
      } else {
        // Like the comment
        await updateDoc(commentRef, {
          likes: arrayUnion(currentUser.uid),
        });

        // Create notification for comment like (only if not liking own comment)
        if (comment.authorId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: comment.authorId,
            fromUserId: currentUser.uid,
            type: "commentLike",
            postId: comment.postId,
            commentId: comment.id,
            commentText: comment.text,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      }
    } catch (error) {
      console.error("Error updating comment like:", error);
      // Revert optimistic state on error
      setOptimisticLikes(currentLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const now = new Date();
    const time = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return "now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return time.toLocaleDateString();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(comment),
        },
      ]
    );
  };

  return (
    <View style={styles.comment}>
      <TouchableOpacity style={styles.commentUserLink}>
        <Image
          source={{
            uri:
              author?.avatarUrl ||
              author?.photoURL ||
              "https://via.placeholder.com/32",
          }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <Text style={styles.commentUsername}>
            {author?.username || "Unknown"}
          </Text>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.commentActions}>
        <TouchableOpacity
          onPress={handleLike}
          style={[styles.likeButton, hasLiked && styles.likeButtonLiked]}
          disabled={isLiking}
        >
          <Text style={[styles.likeIcon, hasLiked && styles.likeIconLiked]}>
            🐾
          </Text>
          {likesCount > 0 && (
            <Text style={[styles.likeCount, hasLiked && styles.likeCountLiked]}>
              {likesCount}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.commentTime}>
          {comment.createdAt ? formatTimeAgo(comment.createdAt) : ""}
        </Text>

        {(isPostOwner || comment.authorId === currentUser?.uid) && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  comment: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  commentUserLink: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  likeButtonLiked: {
    backgroundColor: "rgba(0, 149, 246, 0.1)",
  },
  likeIcon: {
    fontSize: 12,
    color: "#666",
  },
  likeIconLiked: {
    color: "#0095f6",
  },
  likeCount: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  likeCountLiked: {
    color: "#0095f6",
  },
  commentTime: {
    fontSize: 11,
    color: "#999",
  },
  deleteButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  deleteText: {
    fontSize: 16,
    color: "#ff4444",
    fontWeight: "bold",
  },
});

export default CommentItem;
