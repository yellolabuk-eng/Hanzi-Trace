// Local-first data layer for HanziPals. Everything persists via the shared
// storage util (AsyncStorage on native / IndexedDB on web). Objects are stored
// as JSON strings because the storage helper only accepts primitives.
import { storage } from "@/src/utils/storage";

const K = {
  kids: "hp:kids",
  lists: "hp:lists",
  pin: "hp:pin",
  settings: "hp:settings",
  progress: "hp:progress",
  daily: "hp:daily",
  goal: "hp:goal",
  seeded: "hp:seeded:v1",
};

export type Kid = {
  id: string;
  name: string;
  avatar: string; // avatar key
  createdAt: string;
};

export type WordList = {
  id: string;
  name: string;
  icon: string;
  chars: string[];
  builtin?: boolean;
  createdAt: string;
  deleted_at?: string | null;
};

export type Settings = { voice: "zh-CN" | "zh-HK" };

export type CharProgress = { stars: number; mistakes: number; completed: boolean; updatedAt: string };
// progress map key = `${kidId}::${listId}::${char}`
export type ProgressMap = Record<string, CharProgress>;

export type DailyMap = Record<string, { date: string; count: number; streak: number; lastDate: string }>;

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await storage.getItem(key, "");
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await storage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------- Seeding
export async function ensureSeed(): Promise<void> {
  const seeded = await storage.getItem(K.seeded, false);
  if (seeded) return;

  const kids: Kid[] = [
    { id: uid(), name: "Mia", avatar: "panda", createdAt: nowIso() },
  ];
  const lists: WordList[] = [
    {
      id: uid(),
      name: "Nature 大自然",
      icon: "pine-tree",
      chars: ["森", "林", "太", "陽", "月", "亮"],
      builtin: true,
      createdAt: nowIso(),
      deleted_at: null,
    },
    {
      id: uid(),
      name: "Animals 动物",
      icon: "rabbit",
      chars: ["兔", "子", "猫", "狗", "鱼", "鸟"],
      builtin: true,
      createdAt: nowIso(),
      deleted_at: null,
    },
  ];
  await writeJson(K.kids, kids);
  await writeJson(K.lists, lists);
  await writeJson(K.settings, { voice: "zh-CN" } as Settings);
  await storage.setItem(K.pin, "1234");
  await storage.setItem(K.goal, 5);
  await storage.setItem(K.seeded, true);
}

// ---------------------------------------------------------------- Kids
export async function getKids(): Promise<Kid[]> {
  return readJson<Kid[]>(K.kids, []);
}
export async function addKid(name: string, avatar: string): Promise<Kid> {
  const kids = await getKids();
  const kid: Kid = { id: uid(), name: name.trim() || "Friend", avatar, createdAt: nowIso() };
  kids.push(kid);
  await writeJson(K.kids, kids);
  return kid;
}
export async function updateKid(id: string, patch: Partial<Kid>): Promise<void> {
  const kids = await getKids();
  const next = kids.map((k) => (k.id === id ? { ...k, ...patch } : k));
  await writeJson(K.kids, next);
}
export async function deleteKid(id: string): Promise<void> {
  const kids = (await getKids()).filter((k) => k.id !== id);
  await writeJson(K.kids, kids);
}

// ---------------------------------------------------------------- Lists
export async function getLists(): Promise<WordList[]> {
  const all = await readJson<WordList[]>(K.lists, []);
  return all.filter((l) => !l.deleted_at);
}
export async function addList(name: string, icon: string, chars: string[]): Promise<WordList> {
  const all = await readJson<WordList[]>(K.lists, []);
  const list: WordList = {
    id: uid(),
    name: name.trim() || "New List",
    icon,
    chars,
    createdAt: nowIso(),
    deleted_at: null,
  };
  all.push(list);
  await writeJson(K.lists, all);
  return list;
}
export async function updateList(id: string, patch: Partial<WordList>): Promise<void> {
  const all = await readJson<WordList[]>(K.lists, []);
  const next = all.map((l) => (l.id === id ? { ...l, ...patch } : l));
  await writeJson(K.lists, next);
}
export async function softDeleteList(id: string): Promise<void> {
  const all = await readJson<WordList[]>(K.lists, []);
  const next = all.map((l) => (l.id === id ? { ...l, deleted_at: nowIso() } : l));
  await writeJson(K.lists, next);
}

// ---------------------------------------------------------------- PIN
export async function getPin(): Promise<string> {
  return (await storage.getItem(K.pin, "1234")) ?? "1234";
}
export async function setPin(pin: string): Promise<void> {
  await storage.setItem(K.pin, pin);
}

// ---------------------------------------------------------------- Settings
export async function getSettings(): Promise<Settings> {
  return readJson<Settings>(K.settings, { voice: "zh-CN" });
}
export async function setSettings(s: Settings): Promise<void> {
  await writeJson(K.settings, s);
}

// ---------------------------------------------------------------- Goal
export async function getGoal(): Promise<number> {
  return (await storage.getItem(K.goal, 5)) ?? 5;
}
export async function setGoal(n: number): Promise<void> {
  await storage.setItem(K.goal, n);
}

// ---------------------------------------------------------------- Progress
export async function getProgress(): Promise<ProgressMap> {
  return readJson<ProgressMap>(K.progress, {});
}
function pKey(kidId: string, listId: string, char: string) {
  return `${kidId}::${listId}::${char}`;
}
export async function recordCharResult(
  kidId: string,
  listId: string,
  char: string,
  stars: number,
  mistakes: number,
): Promise<void> {
  const map = await getProgress();
  const key = pKey(kidId, listId, char);
  const prev = map[key];
  // keep the best star result
  const bestStars = prev ? Math.max(prev.stars, stars) : stars;
  map[key] = { stars: bestStars, mistakes, completed: true, updatedAt: nowIso() };
  await writeJson(K.progress, map);
  if (!prev?.completed) {
    await bumpDaily(kidId);
  }
}
export function charProgress(map: ProgressMap, kidId: string, listId: string, char: string): CharProgress | undefined {
  return map[pKey(kidId, listId, char)];
}

// ---------------------------------------------------------------- Daily / streak
export async function getDaily(): Promise<DailyMap> {
  return readJson<DailyMap>(K.daily, {});
}
async function bumpDaily(kidId: string): Promise<void> {
  const map = await getDaily();
  const today = todayStr();
  const rec = map[kidId];
  if (!rec) {
    map[kidId] = { date: today, count: 1, streak: 1, lastDate: today };
  } else if (rec.date === today) {
    rec.count += 1;
  } else {
    // new day — update streak based on consecutive days
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    rec.streak = rec.lastDate === y ? rec.streak + 1 : 1;
    rec.date = today;
    rec.count = 1;
    rec.lastDate = today;
  }
  await writeJson(K.daily, map);
}
export async function getDailyFor(kidId: string): Promise<{ count: number; streak: number }> {
  const map = await getDaily();
  const rec = map[kidId];
  if (!rec) return { count: 0, streak: 0 };
  const today = todayStr();
  if (rec.date !== today) {
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    return { count: 0, streak: rec.lastDate === y ? rec.streak : 0 };
  }
  return { count: rec.count, streak: rec.streak };
}
