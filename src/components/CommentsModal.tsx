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
import { useTheme } from "../contexts/ThemeContext";

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
  const { colors } = useTheme();

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalContainer, { backgroundColor: colors.bgPrimary }]}
      >
        <View
          style={[styles.header, { borderBottomColor: colors.borderColor }]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>
              ✕
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Comments
          </Text>
          <View style={styles.placeholder} />
        </View>

        <CommentList
          postId={postId}
          currentUser={currentUser}
          isPostOwner={isPostOwner}
          post={post}
        />

        {currentUser && (
          <View
            style={[
              styles.inputContainer,
              {
                borderTopColor: colors.borderColor,
                backgroundColor: colors.bgPrimary,
              },
            ]}
          >
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  inputContainer: {
    borderTopWidth: 1,
  },
});

export default CommentsModal;
