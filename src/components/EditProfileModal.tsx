import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

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

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  currentUser,
  onProfileUpdate,
}) => {
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || ""
  );
  const [username, setUsername] = useState(currentUser?.username || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!currentUser?.uid) return;

    setLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        displayName,
        username,
        bio,
      });

      const updatedProfile = {
        ...currentUser,
        displayName,
        username,
        bio,
      };

      onProfileUpdate(updatedProfile);
    } catch (err) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || "");
    setUsername(currentUser?.username || "");
    setBio(currentUser?.bio || "");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            width: "90%",
            maxWidth: 400,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            Edit Profile
          </Text>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontWeight: "600", marginBottom: 5 }}>
              Display Name
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
              }}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your display name"
            />
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontWeight: "600", marginBottom: 5 }}>Username</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
              }}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              autoCapitalize="none"
            />
          </View>

          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontWeight: "600", marginBottom: 5 }}>Bio</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                height: 80,
                textAlignVertical: "top",
              }}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#f0f0f0",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                flex: 1,
                marginRight: 10,
              }}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={{ textAlign: "center", fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#007AFF",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                flex: 1,
                marginLeft: 10,
              }}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditProfileModal;
