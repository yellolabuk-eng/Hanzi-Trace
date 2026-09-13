import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HanziBoard, type HanziBoardHandle, type HanziEvent, type HanziMode } from "@/src/components/HanziBoard";
import { Icon } from "@/src/components/Icon";
import { Stars } from "@/src/components/Stars";
import { englishOf, pinyinOf } from "@/src/data/content";
import { getLists, getSettings, recordCharResult, setSettings } from "@/src/data/store";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const MODES: { key: HanziMode; label: string; icon: string }[] = [
  { key: "demonstrate", label: "Watch", icon: "play-circle" },
  { key: "trace", label: "Trace", icon: "gesture-tap" },
  { key: "test", label: "Test", icon: "brain" },
];

function starsFor(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

export default function PracticeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { width, height } = useWindowDimensions();
  const { kidId, listId, index } = useLocalSearchParams<{ kidId: string; listId: string; index: string }>();

  const boardRef = useRef<HanziBoardHandle>(null);
  const [mode, setMode] = useState<HanziMode>("trace");
  const [mistakes, setMistakes] = useState(0);
  const [result, setResult] = useState<{ stars: number; mistakes: number } | null>(null);
  const [listDone, setListDone] = useState(false);
  const shakeX = useSharedValue(0);

  const { data: lists } = useQuery({ queryKey: ["lists"], queryFn: getLists });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const list = (lists ?? []).find((l) => l.id === listId);
  const idx = Math.max(0, parseInt(index ?? "0", 10) || 0);
  const chars = list?.chars ?? [];
  const char = chars[idx] ?? "";
  const isLast = idx >= chars.length - 1;
  const isFirst = idx <= 0;
  const voice = settings?.voice ?? "zh-CN";

  const py = useMemo(() => (char ? pinyinOf(char) : ""), [char]);
  const en = useMemo(() => (char ? englishOf(char) : ""), [char]);

  const boardSize = Math.min(width - 40, height * 0.52, 460);

  const record = useMutation({
    mutationFn: (p: { stars: number; mistakes: number }) =>
      recordCharResult(kidId!, listId!, char, p.stars, p.mistakes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["daily", kidId] });
    },
  });

  const saveVoice = useMutation({
    mutationFn: (v: "zh-CN" | "zh-HK") => setSettings({ voice: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  // reset attempt whenever char or mode changes
  useEffect(() => {
    setMistakes(0);
    setResult(null);
  }, [char, mode]);

  const doShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 55 }),
      withTiming(10, { duration: 55 }),
      withTiming(-7, { duration: 55 }),
      withTiming(7, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
  }, [shakeX]);

  const onEvent = useCallback(
    (evt: HanziEvent) => {
      if (evt.type === "strokeCorrect") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (evt.type === "strokeError") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setMistakes((m) => m + 1);
        doShake();
      } else if (evt.type === "complete") {
        const total = (evt.data?.totalMistakes ?? 0) as number;
        const s = starsFor(total);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        record.mutate({ stars: s, mistakes: total });
        setResult({ stars: s, mistakes: total });
      }
    },
    [doShake, record],
  );

  const goTo = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= chars.length) return;
    router.setParams({ index: String(newIdx) });
  };

  const handleNext = () => {
    setResult(null);
    if (isLast) {
      setListDone(true);
      boardRef.current?.celebrate();
    } else {
      goTo(idx + 1);
    }
  };

  const tryAgain = () => {
    setResult(null);
    setMistakes(0);
    boardRef.current?.reset();
  };

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  if (!list || !char) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.hint}>Loading character…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10} testID="practice-back">
          <Icon name="chevron-left" size={30} color={colors.onSurface} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.pinyin} testID="pinyin-text">
            {py || "—"}
          </Text>
          {!!en && <Text style={styles.english}>{en}</Text>}
        </View>

        <View style={styles.voiceGroup}>
          {(["zh-CN", "zh-HK"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => saveVoice.mutate(v)}
              style={[styles.voiceChip, voice === v && styles.voiceChipActive]}
              testID={`voice-${v}`}
            >
              <Text style={[styles.voiceText, voice === v && styles.voiceTextActive]}>
                {v === "zh-CN" ? "普通话" : "粤语"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.counterRow}>
        <Text style={styles.counter}>
          {idx + 1} / {chars.length} · {list.name}
        </Text>
        <Pressable
          style={styles.pronounce}
          onPress={() => boardRef.current?.speak(char, voice)}
          testID="pronounce-button"
        >
          <Icon name="volume-high" size={22} color={colors.onBrandSecondary} />
          <Text style={styles.pronounceText}>Say it</Text>
        </Pressable>
      </View>

      {/* Board + stars */}
      <View style={styles.middle}>
        <Animated.View style={[{ width: boardSize, height: boardSize }, shakeStyle]}>
          <HanziBoard ref={boardRef} char={char} mode={mode} onEvent={onEvent} />
        </Animated.View>
        <View style={styles.starsWrap}>
          <Stars count={result ? result.stars : Math.max(0, 3 - mistakes)} size={30} direction="column" />
        </View>
      </View>

      {/* Mode hint + replay */}
      <View style={styles.hintRow}>
        <Text style={styles.hint}>
          {mode === "demonstrate"
            ? "Watch how it's written"
            : mode === "trace"
              ? "Trace along the outline"
              : "Write it from memory!"}
        </Text>
        {mode === "demonstrate" && (
          <Pressable style={styles.replayBtn} onPress={() => boardRef.current?.replay()} testID="replay-button">
            <Icon name="replay" size={18} color={colors.brandPrimary} />
            <Text style={styles.replayText}>Replay</Text>
          </Pressable>
        )}
        {mode !== "demonstrate" && (
          <Pressable style={styles.replayBtn} onPress={tryAgain} testID="clear-button">
            <Icon name="eraser" size={18} color={colors.brandPrimary} />
            <Text style={styles.replayText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => {
                Haptics.selectionAsync();
                setMode(m.key);
              }}
              style={[styles.modePill, active && styles.modePillActive]}
              testID={`mode-${m.key}`}
            >
              <Icon name={m.icon} size={22} color={active ? colors.onBrandPrimary : colors.onSurfaceTertiary} />
              <Text style={[styles.modeText, active && styles.modeTextActive]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Prev / Next */}
      <View style={[styles.navRow, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.navBtn, isFirst && styles.navDisabled]}
          onPress={() => goTo(idx - 1)}
          disabled={isFirst}
          testID="prev-char"
        >
          <Icon name="cat" size={26} color={colors.onSurface} />
          <Icon name="chevron-left" size={26} color={colors.onSurface} />
          <Text style={styles.navText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.navBtn, styles.navNext, isLast && styles.navNextLast]}
          onPress={() => goTo(idx + 1)}
          disabled={isLast}
          testID="next-char"
        >
          <Text style={[styles.navText, styles.navTextNext]}>Next</Text>
          <Icon name="chevron-right" size={26} color={colors.onBrandPrimary} />
          <Icon name="rabbit" size={26} color={colors.onBrandPrimary} />
        </Pressable>
      </View>

      {/* Char complete overlay */}
      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <View style={styles.overlay}>
          <View style={styles.rewardCard} testID="reward-card">
            <Text style={styles.rewardTitle}>Great job! 🎉</Text>
            <View style={styles.rewardChar}>
              <Text style={styles.rewardCharText}>{char}</Text>
            </View>
            <Stars count={result?.stars ?? 0} size={44} />
            <Text style={styles.rewardSub}>
              {result?.mistakes === 0 ? "Perfect strokes!" : `${result?.mistakes} little slips`}
            </Text>
            <Pressable style={styles.rewardPrimary} onPress={handleNext} testID="reward-next">
              <Text style={styles.rewardPrimaryText}>{isLast ? "Finish List" : "Next Character"}</Text>
            </Pressable>
            <Pressable style={styles.rewardSecondary} onPress={tryAgain} testID="reward-again">
              <Text style={styles.rewardSecondaryText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* List complete overlay */}
      <Modal visible={listDone} transparent animationType="fade" onRequestClose={() => setListDone(false)}>
        <View style={styles.overlay}>
          <View style={styles.rewardCard} testID="list-done-card">
            <View style={styles.trophyCircle}>
              <Icon name="trophy" size={64} color={colors.onBrandTertiary} />
            </View>
            <Text style={styles.rewardTitle}>List Complete!</Text>
            <Text style={styles.rewardSub}>You finished {list.name} 🌟</Text>
            <Pressable
              style={styles.rewardPrimary}
              onPress={() => {
                setListDone(false);
                router.back();
              }}
              testID="list-done-home"
            >
              <Text style={styles.rewardPrimaryText}>Back to Lists</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  pinyin: { fontFamily: fonts.black, fontSize: 28, color: colors.brandPrimary },
  english: { fontFamily: fonts.bold, fontSize: 15, color: colors.muted, textTransform: "capitalize" },
  voiceGroup: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: 999, padding: 3 },
  voiceChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  voiceChipActive: { backgroundColor: colors.brandPrimary },
  voiceText: { fontFamily: fonts.bold, fontSize: 12, color: colors.onSurfaceTertiary },
  voiceTextActive: { color: colors.onBrandPrimary },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 6,
  },
  counter: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted, flex: 1 },
  pronounce: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  pronounceText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.onBrandSecondary },
  middle: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 8 },
  starsWrap: { justifyContent: "center" },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  hint: { fontFamily: fonts.bold, fontSize: 15, color: colors.onSurfaceTertiary },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.pastelMint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  replayText: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandPrimary },
  modeToggle: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 20,
    padding: 6,
    marginHorizontal: 20,
  },
  modePill: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modePillActive: { backgroundColor: colors.brandPrimary },
  modeText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.onSurfaceTertiary },
  modeTextActive: { color: colors.onBrandPrimary },
  navRow: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  navBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  navNext: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  navNextLast: { opacity: 0.5 },
  navDisabled: { opacity: 0.4 },
  navText: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.onSurface },
  navTextNext: { color: colors.onBrandPrimary },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  rewardCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 14,
  },
  rewardTitle: { fontFamily: fonts.black, fontSize: 26, color: colors.onSurface },
  rewardChar: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.pastelMint,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardCharText: { fontFamily: fonts.black, fontSize: 56, color: colors.onSurface },
  rewardSub: { fontFamily: fonts.bold, fontSize: 16, color: colors.muted },
  rewardPrimary: {
    width: "100%",
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  rewardPrimaryText: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.onBrandPrimary },
  rewardSecondary: { height: 48, alignItems: "center", justifyContent: "center" },
  rewardSecondaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.muted },
  trophyCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
}));
