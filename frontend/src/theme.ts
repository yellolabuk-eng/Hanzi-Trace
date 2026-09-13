// Design tokens for HanziPals — Tactile / Playful LIGHT personality.
// Keys match the "color" block of /app/design_guidelines.json plus a few extras
// used by the practice grid, stars, and playful avatar cards.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

export const fonts = {
  regular: "Nunito-Regular",
  semibold: "Nunito-SemiBold",
  bold: "Nunito-Bold",
  extrabold: "Nunito-ExtraBold",
  black: "Nunito-Black",
};

const light = {
  // Surfaces
  surface: "#FDFBF7",
  onSurface: "#1F2937",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1F2937",
  surfaceTertiary: "#F3F4F6",
  onSurfaceTertiary: "#4B5563",
  surfaceInverse: "#1F2937",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6B7280",

  // Brand
  brand: "#10B981",
  onBrand: "#FFFFFF",
  brandPrimary: "#10B981",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#F43F5E",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FBBF24",
  onBrandTertiary: "#78350F",

  // Status
  success: "#22C55E",
  onSuccess: "#FFFFFF",
  warning: "#EAB308",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#10B981",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",

  // Extras — gamification & grid
  starGold: "#FBBF24",
  starEmpty: "#E5E7EB",
  gridLine: "#F6B8C1",
  overlay: "rgba(31,41,55,0.62)",
  progressTrack: "#FEF3C7",
  progressFill: "#FBBF24",

  // Playful pastel avatar / card backgrounds (warm only, no blue/purple)
  pastelMint: "#D1FAE5",
  pastelCoral: "#FFE4E6",
  pastelYellow: "#FEF3C7",
  pastelPeach: "#FFEDD5",
  pastelGreen: "#DCFCE7",
  pastelPink: "#FCE7F3",
  onPastel: "#3F3F46",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
