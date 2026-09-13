import React from "react";
import { View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { avatarByKey } from "@/src/data/content";
import { useTheme } from "@/src/theme";

type Props = { avatarKey: string; size?: number; testID?: string };

export function Avatar({ avatarKey, size = 96, testID }: Props) {
  const { colors } = useTheme();
  const def = avatarByKey(avatarKey);
  const bg = colors[def.colorKey];
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={def.icon} size={size * 0.58} color={colors.onPastel} />
    </View>
  );
}
