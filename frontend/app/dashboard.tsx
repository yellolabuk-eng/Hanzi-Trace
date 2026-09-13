import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { Icon } from "@/src/components/Icon";
import {
  getDailyFor,
  getGoal,
  getKids,
  getLists,
  getProgress,
  type ProgressMap,
  type WordList,
} from "@/src/data/store";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { ProgressRing } from "@/src/components/ProgressRing";

function completedInList(map: ProgressMap, kidId: string, list: WordList): number {
  return list.chars.filter((ch) => map[`${kidId}::${list.id}::${ch}`]?.completed).length;
}

export default function KidDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { kidId } = useLocalSearchParams<{ kidId: string }>();

  const { data: kids } = useQuery({ queryKey: ["kids"], queryFn: getKids });
  const { data: lists, isLoading } = useQuery({ queryKey: ["lists"], queryFn: getLists });
  const { data: progress } = useQuery({ queryKey: ["progress"], queryFn: getProgress });
  const { data: goal } = useQuery({ queryKey: ["goal"], queryFn: getGoal });
  const { data: daily } = useQuery({
    queryKey: ["daily", kidId],
    queryFn: () => getDailyFor(kidId!),
  });

  const kid = (kids ?? []).find((k) => k.id === kidId);
  const map = progress ?? {};
  const dailyCount = daily?.count ?? 0;
  const streak = daily?.streak ?? 0;
  const goalNum = goal ?? 5;

  const badges = useMemo(() => {
    const mine = Object.entries(map).filter(([k]) => k.startsWith(`${kidId}::`));
    const totalDone = mine.filter(([, v]) => v.completed).length;
    const hasPerfect = mine.some(([, v]) => v.stars >= 3);
    const fullList = (lists ?? []).some(
      (l) => l.chars.length > 0 && completedInList(map, kidId!, l) === l.chars.length,
    );
    return [
      { key: "first", label: "First Word", icon: "medal", earned: totalDone >= 1 },
      { key: "ten", label: "10 Words", icon: "numeric-10-box", earned: totalDone >= 10 },
      { key: "streak", label: `${Math.max(streak, 0)}-Day`, icon: "fire", earned: streak >= 3 },
      { key: "perfect", label: "Perfect!", icon: "crown", earned: hasPerfect },
      { key: "master", label: "List Master", icon: "trophy", earned: fullList },
    ];
  }, [map, kidId, lists, streak]);

  if (!kid) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10} testID="back-button">
          <Icon name="chevron-left" size={30} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerKid}>
          <Avatar avatarKey={kid.avatar} size={44} />
          <View>
            <Text style={styles.hi}>Hi, {kid.name}!</Text>
            <Text style={styles.hiSub}>Let's practice writing ✍️</Text>
          </View>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily goal card */}
        <View style={styles.goalCard}>
          <ProgressRing progress={goalNum ? dailyCount / goalNum : 0} value={dailyCount} goal={goalNum} />
          <View style={{ flex: 1 }}>
            <Text style={styles.goalTitle}>Today's Goal</Text>
            <Text style={styles.goalSub}>
              {dailyCount >= goalNum ? "Goal smashed! 🎉" : `${Math.max(goalNum - dailyCount, 0)} more to go`}
            </Text>
            <View style={styles.streakPill}>
              <Icon name="fire" size={18} color={colors.brandSecondary} />
              <Text style={styles.streakText}>{streak} day streak</Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <Text style={styles.section}>My Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
          {badges.map((b) => (
            <View key={b.key} style={styles.badge} testID={`badge-${b.key}`}>
              <View style={[styles.badgeCircle, b.earned ? styles.badgeOn : styles.badgeOff]}>
                <Icon name={b.icon} size={30} color={b.earned ? colors.onBrandTertiary : colors.muted} />
              </View>
              <Text style={[styles.badgeLabel, !b.earned && { color: colors.muted }]}>{b.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Lessons */}
        <Text style={styles.section}>Word Lists</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 24 }} />
        ) : (lists ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Icon name="book-open-variant" size={54} color={colors.muted} />
            <Text style={styles.emptyText}>Ask a grown-up to add some words!</Text>
          </View>
        ) : (
          <View style={styles.lessonGrid}>
            {(lists ?? []).map((l) => {
              const done = completedInList(map, kidId!, l);
              const total = l.chars.length;
              const complete = total > 0 && done === total;
              return (
                <Pressable
                  key={l.id}
                  style={styles.lessonCard}
                  onPress={() =>
                    router.push({ pathname: "/practice", params: { kidId, listId: l.id, index: "0" } })
                  }
                  testID={`lesson-card-${l.id}`}
                >
                  <View style={styles.lessonTop}>
                    <View style={styles.lessonIcon}>
                      <Icon name={l.icon} size={26} color={colors.brandPrimary} />
                    </View>
                    {complete && (
                      <View style={styles.doneChip}>
                        <Icon name="check-bold" size={14} color={colors.onSuccess} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.lessonName} numberOfLines={2}>
                    {l.name}
                  </Text>
                  <Text style={styles.lessonMeta}>
                    {done}/{total} done
                  </Text>
                  <View style={styles.playBtn}>
                    <Icon name="play" size={18} color={colors.onBrandPrimary} />
                    <Text style={styles.playText}>Play</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerKid: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginLeft: 8 },
  hi: { fontFamily: fonts.black, fontSize: 20, color: colors.onSurface },
  hiSub: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  goalTitle: { fontFamily: fonts.black, fontSize: 20, color: colors.onSurface },
  goalSub: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, marginTop: 2 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pastelCoral,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 10,
  },
  streakText: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandSecondary },
  section: { fontFamily: fonts.black, fontSize: 18, color: colors.onSurface, marginTop: 24, marginBottom: 12 },
  badgeRow: { gap: 14, paddingRight: 12 },
  badge: { alignItems: "center", width: 76, gap: 6 },
  badgeCircle: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  badgeOn: { backgroundColor: colors.brandTertiary },
  badgeOff: { backgroundColor: colors.surfaceTertiary },
  badgeLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.onSurface, textAlign: "center" },
  empty: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyText: { fontFamily: fonts.bold, fontSize: 16, color: colors.muted, textAlign: "center" },
  lessonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  lessonCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 24,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  lessonTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lessonIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.pastelMint,
    alignItems: "center",
    justifyContent: "center",
  },
  doneChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonName: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.onSurface, minHeight: 46 },
  lessonMeta: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    borderRadius: 999,
    height: 46,
    marginTop: 4,
  },
  playText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.onBrandPrimary },
}));
