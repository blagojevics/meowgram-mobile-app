import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import CommentList from "./CommentList";
import CommentInput from "./CommentInput";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  currentUser: any;
  isPostOwner: boolean;
  post: any;
}

const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  postId,
  currentUser,
  isPostOwner,
  post,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Comments</Text>
          <View style={styles.placeholder} />
        </View>

        <CommentList
          postId={postId}
          currentUser={currentUser}
          isPostOwner={isPostOwner}
          post={post}
        />

        {currentUser && (
          <View style={styles.inputContainer}>
            <CommentInput
              postId={postId}
              currentUser={currentUser}
              post={post}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: "#666",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
});

export default CommentsModal;
