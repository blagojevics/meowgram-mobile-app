import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { moderateImageWithAI } from "../services/aiModeration";

type AddPostScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AddPost"
>;

const AddPostScreen: React.FC = () => {
  const navigation = useNavigation<AddPostScreenNavigationProp>();
  const { user } = useAuth();

  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [userDoc, setUserDoc] = useState<any>(null);

  // Fetch user document
  useEffect(() => {
    if (!user) return;

    const fetchUserDoc = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserDoc(userDocSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user document:", error);
      }
    };

    fetchUserDoc();
  }, [user]);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant camera roll permissions to upload images."
        );
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        setModerationMessage("");
        setAiAnalyzing(true);

        // AI moderation check
        try {
          const aiResult = await moderateImageWithAI(imageUri, "post image");
          if (!aiResult.isAllowed) {
            setModerationMessage(`🚫 ${aiResult.reason}`);
          } else {
            setModerationMessage("✅ Image approved!");
          }
        } catch (error) {
          console.error("AI moderation failed:", error);
          setModerationMessage(
            "⚠️ Could not verify image. Please ensure it follows community guidelines."
          );
        } finally {
          setAiAnalyzing(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadToCloudinary = async (imageUri: string) => {
    const formData = new FormData();

    // Get file extension
    const fileExtension = imageUri.split(".").pop();
    const fileName = `post_${Date.now()}.${fileExtension}`;

    formData.append("file", {
      uri: imageUri,
      type: `image/${fileExtension}`,
      name: fileName,
    } as any);

    formData.append(
      "upload_preset",
      process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );
    formData.append(
      "cloud_name",
      process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!
    );

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const result = await response.json();
    return result.secure_url;
  };

  const handleSubmit = async () => {
    if (!user || !userDoc) {
      Alert.alert("Error", "Please log in to create a post");
      return;
    }

    if (!selectedImage) {
      Alert.alert("Error", "Please select an image");
      return;
    }

    if (!caption.trim()) {
      Alert.alert("Error", "Please add a caption");
      return;
    }

    if (moderationMessage.includes("🚫")) {
      Alert.alert(
        "Content Warning",
        "Please choose a different image that follows community guidelines."
      );
      return;
    }

    setLoading(true);

    try {
      // Upload image to Cloudinary
      const imageUrl = await uploadToCloudinary(selectedImage);

      // Create post in Firestore
      const postsCollectionRef = collection(db, "posts");

      await addDoc(postsCollectionRef, {
        userId: user.uid,
        username: userDoc?.username || user.displayName || "Unknown User",
        userAvatar: userDoc?.avatarUrl || user.photoURL || "",
        caption: caption.trim(),
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        likedByUsers: [],
      });

      // Navigate back to home
      navigation.goBack();
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 30,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 8, marginRight: 15 }}
            >
              <Text style={{ fontSize: 18, color: "#007AFF" }}>← Back</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>
              Create New Post
            </Text>
          </View>

          {/* Image Picker */}
          <TouchableOpacity
            onPress={pickImage}
            style={{
              borderWidth: 2,
              borderColor: "#ddd",
              borderStyle: "dashed",
              borderRadius: 10,
              height: 200,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
              backgroundColor: "#f9f9f9",
            }}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={{ width: "100%", height: "100%", borderRadius: 8 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 40, color: "#ccc", marginBottom: 10 }}>
                  📷
                </Text>
                <Text style={{ color: "#666", fontSize: 16 }}>
                  Tap to select image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* AI Moderation Status */}
          {aiAnalyzing && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={{ marginLeft: 10, color: "#666" }}>
                🤖 AI analyzing image...
              </Text>
            </View>
          )}

          {moderationMessage ? (
            <View
              style={{
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
                backgroundColor: moderationMessage.includes("🚫")
                  ? "#ffebee"
                  : "#e8f5e8",
                borderColor: moderationMessage.includes("🚫")
                  ? "#f44336"
                  : "#4caf50",
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  color: moderationMessage.includes("🚫")
                    ? "#c62828"
                    : "#2e7d32",
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {moderationMessage}
              </Text>
            </View>
          ) : null}

          {/* Caption Input */}
          <TextInput
            placeholder="Write a caption..."
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={4}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 15,
              fontSize: 16,
              textAlignVertical: "top",
              marginBottom: 30,
              minHeight: 100,
            }}
          />

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={
              loading ||
              !selectedImage ||
              !caption.trim() ||
              moderationMessage.includes("🚫")
            }
            style={{
              backgroundColor:
                loading ||
                !selectedImage ||
                !caption.trim() ||
                moderationMessage.includes("🚫")
                  ? "#ccc"
                  : "#007AFF",
              paddingVertical: 15,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                Share Post
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddPostScreen;
