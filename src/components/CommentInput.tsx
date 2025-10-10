import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Keyboard,
  Text,
} from "react-native";
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  increment,
} from "firebase/firestore";
import { db } from "../config/firebase";

interface CommentInputProps {
  postId: string;
  currentUser: any;
  post: any;
}

const CommentInput: React.FC<CommentInputProps> = ({
  postId,
  currentUser,
  post,
}) => {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    Keyboard.dismiss();

    const commentData = {
      postId,
      authorId: currentUser?.uid,
      text: trimmed,
      createdAt: serverTimestamp(),
      likes: [],
    };

    try {
      await addDoc(collection(db, "comments"), commentData);
      await updateDoc(doc(db, "posts", postId), {
        commentsCount: increment(1),
      });

      // Create notification for post owner (if not commenting on own post)
      if (post.userId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          fromUserId: currentUser.uid,
          type: "comment",
          postId,
          commentText: trimmed,
          createdAt: serverTimestamp(),
          read: false,
        });
      }

      setText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
      Alert.alert("Error", "Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === "Enter" && !e.shiftKey) {
      handleSubmit();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Image
          source={{
            uri:
              currentUser?.avatarUrl ||
              currentUser?.photoURL ||
              "https://via.placeholder.com/32",
          }}
          style={styles.avatar}
        />

        <TextInput
          ref={textInputRef}
          value={text}
          onChangeText={setText}
          placeholder="Write a comment..."
          style={styles.textInput}
          multiline
          maxLength={500}
          onKeyPress={handleKeyPress}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!text.trim() || isSubmitting}
          style={[
            styles.submitButton,
            (!text.trim() || isSubmitting) && styles.submitButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.sendText,
              (!text.trim() || isSubmitting) && styles.sendTextDisabled,
            ]}
          >
            Send
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
    minHeight: 36,
    textAlignVertical: "center",
  },
  submitButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0095f6",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#f0f0f0",
  },
  sendText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  sendTextDisabled: {
    color: "#ccc",
  },
});

export default CommentInput;
