import React from "react";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import type { TextStyle, StyleProp } from "react-native";

type Props = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 24, color = "#000", style }: Props) {
  return <MaterialDesignIcons name={name as any} size={size} color={color} style={style} />;
}
