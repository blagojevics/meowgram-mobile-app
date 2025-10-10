import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const { width } = Dimensions.get("window");
const PAGE_SIZE = 20;

type Props = NativeStackScreenProps<RootStackParamList, "MainTabs">;

interface Notification {
  id: string;
  userId: string;
  fromUserId: string;
  type: "follow" | "like" | "comment";
  postId?: string;
  createdAt: any;
  read: boolean;
}

interface UserData {
  uid: string;
  username: string;
  avatarUrl?: string;
}

const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});

  // Load notifications
  const loadMoreNotifications = async (isInitialLoad = false) => {
    if (!user || loading || (!isInitialLoad && !hasMore)) return;

    setLoading(true);
    try {
      let q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (!isInitialLoad && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      const list: Notification[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      // Get unique user IDs to fetch user data
      const userIds = [...new Set(list.map((n) => n.fromUserId))];
      const newUserIds = userIds.filter((id) => !usersMap[id]);

      if (newUserIds.length > 0) {
        const userPromises = newUserIds.map(async (userId) => {
          const userDoc = await getDocs(
            query(collection(db, "users"), where("uid", "==", userId))
          );
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data() as UserData;
            return { userId, userData };
          }
          return null;
        });

        const userResults = await Promise.all(userPromises);
        const newUsersMap: Record<string, UserData> = { ...usersMap };

        userResults.forEach((result) => {
          if (result) {
            newUsersMap[result.userId] = result.userData;
          }
        });

        setUsersMap(newUsersMap);
      }

      setNotifications((prev) => (isInitialLoad ? list : [...prev, ...list]));
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(list.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      loadMoreNotifications(true);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Format notification message
  const getNotificationMessage = (notification: Notification) => {
    const fromUser = usersMap[notification.fromUserId];
    const username = fromUser?.username || "Someone";

    switch (notification.type) {
      case "follow":
        return `${username} started following you`;
      case "like":
        return `${username} liked your post`;
      case "comment":
        return `${username} commented on your post`;
      default:
        return `${username} interacted with your post`;
    }
  };

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;

    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const fromUser = usersMap[item.fromUserId];

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
        ]}
        onPress={() => {
          if (!item.read) {
            markAsRead(item.id);
          }
          // Navigate to relevant screen based on notification type
          if (item.type === "follow" && item.fromUserId) {
            // Navigate to user profile
          } else if (item.postId) {
            // Navigate to post
          }
        }}
      >
        <Image
          source={{
            uri: fromUser?.avatarUrl || "https://via.placeholder.com/40",
          }}
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            {getNotificationMessage(item)}
          </Text>
          <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Please log in to view notifications</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {!initialLoad ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            When someone interacts with you, you'll see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          onEndReached={() => loadMoreNotifications(false)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={styles.footerLoader}
              />
            ) : null
          }
          contentContainerStyle={styles.notificationsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    width: width > 550 ? width * 0.5 : width,
    alignSelf: "center",
  },
  header: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  notificationsList: {
    paddingVertical: 10,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  unreadNotification: {
    backgroundColor: "#f8f9ff",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
  },
  footerLoader: {
    padding: 20,
  },
});

export default NotificationsScreen;
