import React, { useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type CropImageScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CropImage"
>;

const { width } = Dimensions.get("window");

const CropImageScreen = () => {
  const navigation = useNavigation<CropImageScreenNavigationProp>();
  const route = useRoute();
  const { colors } = useTheme();
  const { imageUri } = route.params as { imageUri: string };

  const handleCrop = () => {
    // Since we are not actually cropping, we just pass the original image URI back
    navigation.navigate("AddPost", { selectedImage: imageUri });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.textPrimary }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Image Preview
        </Text>
        <TouchableOpacity onPress={handleCrop}>
          <Text style={{ color: colors.brandPrimary }}>Done</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  image: {
    width: width,
    height: width,
  },
});

export default CropImageScreen;
