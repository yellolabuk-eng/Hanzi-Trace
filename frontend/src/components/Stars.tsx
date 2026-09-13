import React from "react";
import { View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";

type Props = { count: number; size?: number; direction?: "row" | "column" };

export function Stars({ count, size = 34, direction = "row" }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.row, direction === "column" && styles.col]} testID="stars">
      {[0, 1, 2].map((i) => (
        <Icon
          key={i}
          name={i < count ? "star" : "star-outline"}
          size={size}
          color={i < count ? colors.starGold : colors.starEmpty}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: "row", gap: 2, alignItems: "center" },
  col: { flexDirection: "column" },
}));
