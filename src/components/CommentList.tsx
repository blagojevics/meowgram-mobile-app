import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../config/firebase";
import CommentItem from "./CommentItem";

interface CommentListProps {
  postId: string;
  currentUser: any;
  isPostOwner: boolean;
  post: any;
}

const CommentList: React.FC<CommentListProps> = ({
  postId,
  currentUser,
  isPostOwner,
  post,
}) => {
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (!postId) return;

    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const commentsData: any[] = [];
      const updatesNeeded: Promise<any>[] = [];

      snap.docs.forEach((d) => {
        const data = d.data();
        const commentData = {
          id: d.id,
          ...data,
          createdAt: data.createdAt || { toDate: () => new Date(0) },
          likes: data.likes || [],
        };
        commentsData.push(commentData);

        // If this comment doesn't have a likes field in Firestore, add it
        if (!data.likes) {
          updatesNeeded.push(
            updateDoc(doc(db, "comments", d.id), { likes: [] })
          );
        }
      });

      setComments(commentsData);

      // Update comments that don't have likes field (run in background)
      if (updatesNeeded.length > 0) {
        Promise.all(updatesNeeded).catch(console.error);
      }
    });

    return () => unsub();
  }, [postId]);

  const handleDelete = async (comment: any) => {
    if (isPostOwner || comment.authorId === currentUser.uid) {
      await deleteDoc(doc(db, "comments", comment.id));
      await updateDoc(doc(db, "posts", postId), {
        commentsCount: increment(-1),
      });
    }
  };

  const renderComment = ({ item }: { item: any }) => (
    <CommentItem
      key={item.id}
      comment={item}
      currentUser={currentUser}
      isPostOwner={isPostOwner}
      onDelete={handleDelete}
      post={post}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
  },
});

export default CommentList;
