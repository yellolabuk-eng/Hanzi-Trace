import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { Icon } from "@/src/components/Icon";
import { PinModal } from "@/src/components/PinModal";
import { AVATARS } from "@/src/data/content";
import { addKid, ensureSeed, getKids, getPin } from "@/src/data/store";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export default function ProfilePicker() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0].key);

  const { data: kids, isLoading } = useQuery({
    queryKey: ["kids"],
    queryFn: async () => {
      await ensureSeed();
      return getKids();
    },
  });
  const { data: pin } = useQuery({ queryKey: ["pin"], queryFn: getPin });

  const createKid = useMutation({
    mutationFn: () => addKid(name, avatar),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kids"] });
      setAddOpen(false);
      setName("");
      setAvatar(AVATARS[0].key);
    },
  });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoDot}>
            <Icon name="brush" size={26} color={colors.onBrandPrimary} />
          </View>
          <View>
            <Text style={styles.brand}>HanziPals</Text>
            <Text style={styles.brandSub}>Who's practicing today?</Text>
          </View>
        </View>
        <Pressable
          style={styles.gear}
          onPress={() => setPinOpen(true)}
          hitSlop={12}
          testID="parent-gate-button"
        >
          <Icon name="lock" size={22} color={colors.onSurfaceTertiary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {(kids ?? []).map((kid) => (
            <Pressable
              key={kid.id}
              style={styles.kidCard}
              onPress={() => router.push({ pathname: "/dashboard", params: { kidId: kid.id } })}
              testID={`kid-card-${kid.id}`}
            >
              <Avatar avatarKey={kid.avatar} size={110} />
              <Text style={styles.kidName} numberOfLines={1}>
                {kid.name}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={[styles.kidCard, styles.addCard]}
            onPress={() => setAddOpen(true)}
            testID="add-kid-button"
          >
            <View style={styles.addCircle}>
              <Icon name="plus" size={44} color={colors.brandPrimary} />
            </View>
            <Text style={[styles.kidName, { color: colors.brandPrimary }]}>Add Kid</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Add kid modal */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={16}
          style={styles.modalRoot}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} testID="add-kid-sheet">
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Profile</Text>

            <View style={styles.previewRow}>
              <Avatar avatarKey={avatar} size={88} />
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Leo"
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={16}
              testID="kid-name-input"
            />

            <Text style={styles.label}>Choose a buddy</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
              {AVATARS.map((a) => (
                <Pressable
                  key={a.key}
                  onPress={() => setAvatar(a.key)}
                  style={[styles.avatarPick, avatar === a.key && styles.avatarPickActive]}
                  testID={`avatar-pick-${a.key}`}
                >
                  <Avatar avatarKey={a.key} size={64} />
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.primaryBtn, createKid.isPending && styles.btnDisabled]}
              onPress={() => createKid.mutate()}
              disabled={createKid.isPending}
              testID="save-kid-button"
            >
              <Text style={styles.primaryBtnText}>Save Profile</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setAddOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PinModal
        visible={pinOpen}
        mode="verify"
        expectedPin={pin ?? "1234"}
        onClose={() => setPinOpen(false)}
        onVerified={() => {
          setPinOpen(false);
          router.push("/parent");
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoDot: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontFamily: fonts.black, fontSize: 26, color: colors.onSurface },
  brandSub: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  gear: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  kidCard: {
    width: 150,
    height: 180,
    borderRadius: 28,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  addCard: {
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.brandPrimary,
    borderStyle: "dashed",
  },
  addCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.pastelMint,
    alignItems: "center",
    justifyContent: "center",
  },
  kidName: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.onSurface, maxWidth: 130 },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontFamily: fonts.black, fontSize: 24, color: colors.onSurface, textAlign: "center" },
  previewRow: { alignItems: "center", marginVertical: 16 },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.onSurfaceTertiary, marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 60,
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.onSurface,
  },
  avatarRow: { gap: 12, paddingVertical: 6, paddingRight: 12 },
  avatarPick: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarPickActive: { borderColor: colors.brandPrimary, backgroundColor: colors.pastelMint },
  primaryBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 20,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.onBrandPrimary },
  cancelBtn: { height: 52, alignItems: "center", justifyContent: "center", marginTop: 4 },
  cancelText: { fontFamily: fonts.bold, fontSize: 16, color: colors.muted },
}));
