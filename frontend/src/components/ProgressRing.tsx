import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { fonts, useTheme } from "@/src/theme";

type Props = {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  value: number;
  goal: number;
};

export function ProgressRing({ size = 92, stroke = 12, progress, value, goal }: Props) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = c * (1 - clamped);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.progressTrack} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.progressFill}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontFamily: fonts.black, fontSize: 22, color: colors.onSurface }}>{value}</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.muted }}>/ {goal}</Text>
      </View>
    </View>
  );
}
