import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

interface LikesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  likedByUsers: string[];
}

const LikesListModal: React.FC<LikesListModalProps> = ({
  isOpen,
  onClose,
  likedByUsers,
}) => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || likedByUsers.length === 0) return;

    const q = query(
      collection(db, "users"),
      where("__name__", "in", likedByUsers.slice(0, 10)) // Firestore 'in' limit is 10
    );

    const unsub = onSnapshot(q, (snap) => {
      const usersData = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    });

    return () => unsub();
  }, [isOpen, likedByUsers]);

  const renderUser = ({ item }: { item: any }) => (
    <View style={styles.userItem}>
      <Text style={styles.username}>{item.username || "Unknown User"}</Text>
    </View>
  );

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
          <Text style={styles.title}>Likes</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {users.length === 0 ? (
            <Text style={styles.emptyText}>No likes yet</Text>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={renderUser}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
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
  content: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
  },
  userItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  username: {
    fontSize: 16,
    color: "#333",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 50,
  },
});

export default LikesListModal;
