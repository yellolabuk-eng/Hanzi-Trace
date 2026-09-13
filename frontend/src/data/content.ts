// Static content helpers: pinyin generation, English glossary, avatar catalog.
import { pinyin } from "pinyin-pro";

// A friendly English glossary for common early-learning characters.
// Unknown characters simply omit the English line.
export const ENGLISH: Record<string, string> = {
  森: "forest",
  林: "woods",
  太: "big / very",
  陽: "sun",
  阳: "sun",
  月: "moon",
  亮: "bright",
  兔: "rabbit",
  子: "child",
  猫: "cat",
  貓: "cat",
  狗: "dog",
  鱼: "fish",
  魚: "fish",
  鸟: "bird",
  鳥: "bird",
  日: "sun / day",
  人: "person",
  大: "big",
  小: "small",
  山: "mountain",
  水: "water",
  火: "fire",
  木: "tree",
  花: "flower",
  草: "grass",
  家: "home",
  学: "study",
  好: "good",
  爱: "love",
  星: "star",
  云: "cloud",
  雨: "rain",
  风: "wind",
  雪: "snow",
  马: "horse",
  牛: "cow",
  羊: "sheep",
  猪: "pig",
  鸡: "chicken",
  鸭: "duck",
  熊: "bear",
  猴: "monkey",
};

export function pinyinOf(char: string): string {
  try {
    const p = pinyin(char, { toneType: "symbol", type: "string" });
    return typeof p === "string" ? p.trim() : "";
  } catch {
    return "";
  }
}

export function englishOf(char: string): string {
  return ENGLISH[char] ?? "";
}

// Split a pasted block into individual Chinese characters (drop spaces,
// punctuation, latin, numbers). Supports Simplified + Traditional.
export function splitChars(text: string): string[] {
  const chars: string[] = [];
  const seen = new Set<string>();
  for (const ch of Array.from(text)) {
    if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(ch)) {
      if (!seen.has(ch)) {
        seen.add(ch);
        chars.push(ch);
      }
    }
  }
  return chars;
}

// Avatar catalog — MDI animal icons + warm pastel backgrounds.
export type AvatarDef = { key: string; icon: string; colorKey: keyof AvatarColorKeys };
type AvatarColorKeys = {
  pastelMint: string;
  pastelCoral: string;
  pastelYellow: string;
  pastelPeach: string;
  pastelGreen: string;
  pastelPink: string;
};

export const AVATARS: AvatarDef[] = [
  { key: "panda", icon: "panda", colorKey: "pastelMint" },
  { key: "rabbit", icon: "rabbit", colorKey: "pastelCoral" },
  { key: "cat", icon: "cat", colorKey: "pastelYellow" },
  { key: "dog", icon: "dog", colorKey: "pastelPeach" },
  { key: "owl", icon: "owl", colorKey: "pastelGreen" },
  { key: "penguin", icon: "penguin", colorKey: "pastelPink" },
  { key: "koala", icon: "koala", colorKey: "pastelMint" },
  { key: "elephant", icon: "elephant", colorKey: "pastelPeach" },
  { key: "duck", icon: "duck", colorKey: "pastelYellow" },
  { key: "fish", icon: "fish", colorKey: "pastelGreen" },
];

export function avatarByKey(key: string): AvatarDef {
  return AVATARS.find((a) => a.key === key) ?? AVATARS[0];
}

// Icons available for word lists.
export const LIST_ICONS = [
  "pine-tree",
  "rabbit",
  "food-apple",
  "school",
  "cat",
  "star",
  "heart",
  "weather-sunny",
  "flower",
  "book-open-variant",
];
