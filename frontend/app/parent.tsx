import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { Icon } from "@/src/components/Icon";
import { PinModal } from "@/src/components/PinModal";
import { LIST_ICONS, splitChars } from "@/src/data/content";
import {
  addList,
  deleteKid,
  getGoal,
  getKids,
  getLists,
  setGoal,
  setPin,
  softDeleteList,
  updateList,
  type WordList,
} from "@/src/data/store";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export default function ParentMode() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [editor, setEditor] = useState<{ open: boolean; list?: WordList }>({ open: false });
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(LIST_ICONS[0]);
  const [raw, setRaw] = useState("");
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);

  const { data: lists } = useQuery({ queryKey: ["lists"], queryFn: getLists });
  const { data: kids } = useQuery({ queryKey: ["kids"], queryFn: getKids });
  const { data: goal } = useQuery({ queryKey: ["goal"], queryFn: getGoal });

  const invalidateLists = () => qc.invalidateQueries({ queryKey: ["lists"] });

  const saveList = useMutation({
    mutationFn: async () => {
      const chars = splitChars(raw);
      if (editor.list) {
        await updateList(editor.list.id, { name, icon, chars });
      } else {
        await addList(name, icon, chars);
      }
    },
    onSuccess: () => {
      invalidateLists();
      closeEditor();
    },
  });

  const removeList = useMutation({
    mutationFn: (id: string) => softDeleteList(id),
    onSuccess: () => {
      invalidateLists();
      setConfirmDel(null);
    },
  });

  const removeKid = useMutation({
    mutationFn: (id: string) => deleteKid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kids"] }),
  });

  const changeGoal = useMutation({
    mutationFn: (n: number) => setGoal(n),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  });

  const changePin = useMutation({
    mutationFn: (p: string) => setPin(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pin"] });
      setPinOpen(false);
    },
  });

  const openNew = () => {
    setName("");
    setIcon(LIST_ICONS[0]);
    setRaw("");
    setEditor({ open: true });
  };
  const openEdit = (l: WordList) => {
    setName(l.name);
    setIcon(l.icon);
    setRaw(l.chars.join(""));
    setEditor({ open: true, list: l });
  };
  const closeEditor = () => setEditor({ open: false });

  const preview = splitChars(raw);
  const goalNum = goal ?? 5;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10} testID="parent-back">
          <Icon name="chevron-left" size={28} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Parent / Teacher</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Word lists */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Word Lists</Text>
          <Pressable style={styles.addBtn} onPress={openNew} testID="add-list-button">
            <Icon name="plus" size={20} color={colors.onBrandPrimary} />
            <Text style={styles.addBtnText}>New</Text>
          </Pressable>
        </View>

        {(lists ?? []).length === 0 ? (
          <Text style={styles.emptyText}>Create your first word list.</Text>
        ) : (
          (lists ?? []).map((l) => (
            <View key={l.id} style={styles.row} testID={`parent-list-${l.id}`}>
              <View style={styles.rowIcon}>
                <Icon name={l.icon} size={22} color={colors.onSurfaceTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{l.name}</Text>
                <Text style={styles.rowSub}>{l.chars.length} characters · {l.chars.join(" ")}</Text>
              </View>
              <Pressable style={styles.rowAction} onPress={() => openEdit(l)} testID={`edit-list-${l.id}`}>
                <Icon name="pencil" size={20} color={colors.info} />
              </Pressable>
              <Pressable
                style={styles.rowAction}
                onPress={() => setConfirmDel({ id: l.id, name: l.name })}
                testID={`delete-list-${l.id}`}
              >
                <Icon name="delete" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))
        )}

        {/* Kids */}
        <Text style={[styles.section, { marginTop: 28 }]}>Kid Profiles</Text>
        {(kids ?? []).map((k) => (
          <View key={k.id} style={styles.row} testID={`parent-kid-${k.id}`}>
            <Avatar avatarKey={k.avatar} size={44} />
            <Text style={[styles.rowTitle, { flex: 1, marginLeft: 12 }]}>{k.name}</Text>
            <Pressable
              style={styles.rowAction}
              onPress={() => removeKid.mutate(k.id)}
              testID={`delete-kid-${k.id}`}
            >
              <Icon name="delete" size={20} color={colors.error} />
            </Pressable>
          </View>
        ))}

        {/* Settings */}
        <Text style={[styles.section, { marginTop: 28 }]}>Settings</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Daily Goal</Text>
              <Text style={styles.settingSub}>Characters per day</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepBtn}
                onPress={() => changeGoal.mutate(Math.max(1, goalNum - 1))}
                testID="goal-minus"
              >
                <Icon name="minus" size={20} color={colors.onSurface} />
              </Pressable>
              <Text style={styles.stepValue}>{goalNum}</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() => changeGoal.mutate(Math.min(30, goalNum + 1))}
                testID="goal-plus"
              >
                <Icon name="plus" size={20} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>
          <View style={styles.settingDivider} />
          <Pressable style={styles.settingRow} onPress={() => setPinOpen(true)} testID="change-pin-button">
            <View>
              <Text style={styles.settingTitle}>Change PIN</Text>
              <Text style={styles.settingSub}>Locks Parent Mode</Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>

      {/* List editor */}
      <Modal visible={editor.open} animationType="slide" onRequestClose={closeEditor}>
        <View style={[styles.editorRoot, { paddingTop: insets.top }]}>
          <View style={styles.editorHeader}>
            <Pressable onPress={closeEditor} hitSlop={10} testID="editor-cancel">
              <Text style={styles.editorCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.editorTitle}>{editor.list ? "Edit List" : "New List"}</Text>
            <Pressable
              onPress={() => preview.length > 0 && name.trim() && saveList.mutate()}
              disabled={preview.length === 0 || !name.trim()}
              hitSlop={10}
              testID="editor-save"
            >
              <Text style={[styles.editorSave, (preview.length === 0 || !name.trim()) && { opacity: 0.4 }]}>
                Save
              </Text>
            </Pressable>
          </View>

          <KeyboardAwareScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            bottomOffset={20}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>List Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Food, Animals, Homework"
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={30}
              testID="list-name-input"
            />

            <Text style={styles.label}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
              {LIST_ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  style={[styles.iconPick, icon === ic && styles.iconPickActive]}
                  testID={`icon-${ic}`}
                >
                  <Icon name={ic} size={26} color={icon === ic ? colors.onBrandPrimary : colors.onSurfaceTertiary} />
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Paste Chinese Characters</Text>
            <Text style={styles.helper}>Simplified or Traditional. We'll split them into cards.</Text>
            <TextInput
              value={raw}
              onChangeText={setRaw}
              placeholder="森林 太陽 月亮 兔子…"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.inputMulti]}
              multiline
              textAlignVertical="top"
              testID="list-chars-input"
            />

            {preview.length > 0 && (
              <>
                <Text style={styles.label}>Preview ({preview.length})</Text>
                <View style={styles.previewGrid}>
                  {preview.map((ch, i) => (
                    <View key={`${ch}-${i}`} style={styles.previewCard}>
                      <Text style={styles.previewChar}>{ch}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!confirmDel} transparent animationType="fade" onRequestClose={() => setConfirmDel(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard} testID="confirm-delete">
            <Text style={styles.confirmTitle}>Delete "{confirmDel?.name}"?</Text>
            <Text style={styles.confirmSub}>This word list will be removed.</Text>
            <Pressable
              style={styles.confirmDanger}
              onPress={() => confirmDel && removeList.mutate(confirmDel.id)}
              testID="confirm-delete-yes"
            >
              <Text style={styles.confirmDangerText}>Delete</Text>
            </Pressable>
            <Pressable style={styles.confirmCancel} onPress={() => setConfirmDel(null)}>
              <Text style={styles.confirmCancelText}>Keep it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <PinModal
        visible={pinOpen}
        mode="set"
        title="Set a new PIN"
        onClose={() => setPinOpen(false)}
        onSet={(p) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          changePin.mutate(p);
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceTertiary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.onSurface },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.onSurfaceTertiary, marginBottom: 12 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 12,
  },
  addBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onBrandPrimary },
  emptyText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted, paddingVertical: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  rowSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  rowAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  settingCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  settingDivider: { height: 1, backgroundColor: colors.divider },
  settingTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  settingSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.onSurface, minWidth: 26, textAlign: "center" },
  // editor
  editorRoot: { flex: 1, backgroundColor: colors.surface },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editorCancel: { fontFamily: fonts.bold, fontSize: 16, color: colors.muted },
  editorTitle: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.onSurface },
  editorSave: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.brandPrimary },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.onSurfaceTertiary, marginTop: 18, marginBottom: 8 },
  helper: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: 8, marginTop: -4 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.onSurface,
  },
  inputMulti: { height: 120, paddingTop: 14 },
  iconRow: { gap: 10, paddingVertical: 4 },
  iconPick: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPickActive: { backgroundColor: colors.brandPrimary },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  previewCard: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: colors.pastelMint,
    alignItems: "center",
    justifyContent: "center",
  },
  previewChar: { fontFamily: fonts.black, fontSize: 30, color: colors.onSurface },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  confirmTitle: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.onSurface, textAlign: "center" },
  confirmSub: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, textAlign: "center" },
  confirmDanger: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  confirmDangerText: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.onError },
  confirmCancel: { height: 48, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontFamily: fonts.bold, fontSize: 15, color: colors.muted },
}));
