import React from "react";
import { View, Image, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const HomeScreenHeader = () => {
  const { theme, toggleTheme, colors } = useTheme();

  return (
    <View style={styles.header}>
      <Image
        source={require("../../assets/logohomepage.png")}
        style={[styles.logoImageLarge, { tintColor: colors.logoColor }]}
        resizeMode="contain"
      />
      <TouchableOpacity
        style={[
          styles.themeToggle,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: colors.borderColor,
          },
        ]}
        onPress={toggleTheme}
      >
        <Text style={{ fontSize: 18, color: colors.textPrimary }}>
          {theme === "light" ? "☾" : "☀️"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  logoImageLarge: {
    width: 100,
    height: 44,
  },
  themeToggle: {
    borderWidth: 1,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(HomeScreenHeader);
