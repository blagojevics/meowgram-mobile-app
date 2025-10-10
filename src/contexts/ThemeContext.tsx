import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeColors = {
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Border colors
  borderColor: string;
  borderLight: string;

  // Interactive colors
  hoverBg: string;
  activeBg: string;

  // Shadow colors
  shadowLight: string;
  shadowMedium: string;
  shadowDark: string;

  // Brand colors (same in both themes)
  brandPrimary: string;
  brandSecondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;

  // Logo
  logoColor: string;
  logoFilter: string;
};

type ThemeContextType = {
  theme: "light" | "dark";
  toggleTheme: () => void;
  isLight: boolean;
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const lightColors: ThemeColors = {
  bgPrimary: "#ffffff",
  bgSecondary: "#f5f5f5",
  bgTertiary: "#e9ecef",
  textPrimary: "#212529",
  textSecondary: "#6c757d",
  textMuted: "#adb5bd",
  borderColor: "#dee2e6",
  borderLight: "#e9ecef",
  hoverBg: "#f8f9fa",
  activeBg: "#e9ecef",
  shadowLight: "rgba(0, 0, 0, 0.1)",
  shadowMedium: "rgba(0, 0, 0, 0.15)",
  shadowDark: "rgba(0, 0, 0, 0.25)",
  brandPrimary: "#0095f6",
  brandSecondary: "#e74c3c",
  success: "#28a745",
  warning: "#ffc107",
  danger: "#dc3545",
  info: "#17a2b8",
  logoColor: "#212529",
  logoFilter: "none",
};

const darkColors: ThemeColors = {
  bgPrimary: "#181818",
  bgSecondary: "#1f1f1f",
  bgTertiary: "#2f2f2f",
  textPrimary: "#d4d4d4",
  textSecondary: "#b8b8b8",
  textMuted: "#999999",
  borderColor: "#3a3a3a",
  borderLight: "#484848",
  hoverBg: "#2a2a2a",
  activeBg: "#353535",
  shadowLight: "rgba(0, 0, 0, 0.3)",
  shadowMedium: "rgba(0, 0, 0, 0.5)",
  shadowDark: "rgba(0, 0, 0, 0.7)",
  brandPrimary: "#0095f6",
  brandSecondary: "#e74c3c",
  success: "#28a745",
  warning: "#ffc107",
  danger: "#dc3545",
  info: "#17a2b8",
  logoColor: "#d4d4d4",
  logoFilter: "brightness(0) invert(1) opacity(0.83)",
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Load saved theme from AsyncStorage
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("meowgram-theme");
        if (savedTheme === "light" || savedTheme === "dark") {
          setTheme(savedTheme);
        } else {
          // Check system preference if no saved theme
          const systemTheme = Appearance.getColorScheme();
          setTheme(systemTheme === "dark" ? "dark" : "light");
        }
      } catch (error) {
        console.error("Error loading theme:", error);
        const systemTheme = Appearance.getColorScheme();
        setTheme(systemTheme === "dark" ? "dark" : "light");
      }
    };

    loadTheme();
  }, []);

  useEffect(() => {
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(
      ({ colorScheme }: { colorScheme: ColorSchemeName }) => {
        // Only auto-switch if user hasn't manually set a preference
        const updateTheme = async () => {
          try {
            const savedTheme = await AsyncStorage.getItem("meowgram-theme");
            if (!savedTheme) {
              setTheme(colorScheme === "dark" ? "dark" : "light");
            }
          } catch (error) {
            console.error("Error checking saved theme:", error);
          }
        };
        updateTheme();
      }
    );

    return () => subscription?.remove();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem("meowgram-theme", newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const colors = theme === "light" ? lightColors : darkColors;

  const value = {
    theme,
    toggleTheme,
    isLight: theme === "light",
    isDark: theme === "dark",
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
