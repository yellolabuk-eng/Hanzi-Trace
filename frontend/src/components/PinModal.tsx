import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { fonts, makeStyles, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  mode: "verify" | "set";
  expectedPin?: string;
  title?: string;
  onClose: () => void;
  onVerified?: () => void;
  onSet?: (pin: string) => void;
};

export function PinModal({ visible, mode, expectedPin, title, onClose, onVerified, onSet }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (visible) {
      setPin("");
      setError(false);
    }
  }, [visible]);

  const submit = (value: string) => {
    if (mode === "verify") {
      if (value === (expectedPin ?? "1234")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onVerified?.();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 600);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSet?.(value);
    }
  };

  const press = (digit: string) => {
    Haptics.selectionAsync();
    setError(false);
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) setTimeout(() => submit(next), 120);
  };

  const back = () => {
    Haptics.selectionAsync();
    setPin((p) => p.slice(0, -1));
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="pin-modal">
          <Pressable style={styles.close} onPress={onClose} testID="pin-close">
            <Icon name="close" size={26} color={colors.onSurfaceTertiary} />
          </Pressable>
          <View style={styles.lockCircle}>
            <Icon name="lock" size={32} color={colors.onSurfaceTertiary} />
          </View>
          <Text style={styles.title}>{title ?? (mode === "set" ? "Set a new PIN" : "Grown-ups only")}</Text>
          <Text style={styles.subtitle}>
            {error ? "Oops! Try again" : mode === "set" ? "Enter 4 digits" : "Enter the 4-digit PIN"}
          </Text>

          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                  error && styles.dotError,
                ]}
              />
            ))}
          </View>

          <View style={styles.pad}>
            {keys.map((k) => (
              <Pressable key={k} style={styles.key} onPress={() => press(k)} testID={`pin-key-${k}`}>
                <Text style={styles.keyText}>{k}</Text>
              </Pressable>
            ))}
            <View style={styles.key} />
            <Pressable style={styles.key} onPress={() => press("0")} testID="pin-key-0">
              <Text style={styles.keyText}>0</Text>
            </Pressable>
            <Pressable style={styles.key} onPress={back} testID="pin-key-back">
              <Icon name="backspace-outline" size={26} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  close: { position: "absolute", top: 14, right: 14, padding: 8 },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.onSurface },
  subtitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted, marginTop: 4 },
  dots: { flexDirection: "row", gap: 16, marginVertical: 22 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  dotFilled: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dotError: { backgroundColor: colors.error, borderColor: colors.error },
  pad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, width: 276 },
  key: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.onSurface },
}));
