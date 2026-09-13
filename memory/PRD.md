# HanziPals — Product Requirements Document

## Original Problem Statement
Build a gamified, tablet-first Chinese handwriting practice app for young children using a stylus/pen or finger. Integrate hanzi-writer (stroke order data, animations, tracing guides, stroke validation quizzes), canvas-confetti, synthesized sound effects, and speech synthesis. Parent Mode (PIN-locked) for managing custom word lists (Simplified + Traditional). Child practice screen with 田字格/米字格 grid and 3 modes (Demonstrate, Guided Trace, Test/Memory). Gamification: star ratings, confetti, sounds, mascot nav. Store everything locally.

## Architecture
- **Frontend:** Expo (React Native) + expo-router (stack). Local-first, no backend usage.
- **Hanzi engine:** hanzi-writer + canvas-confetti + Web Audio + Web Speech run inside a WebView (native) / same-origin srcDoc iframe (web) — `src/components/HanziBoard.tsx` + `HanziBoard.web.tsx`, HTML built in `src/webview/hanziHtml.ts`.
- **Offline data:** stroke data for the 12 sample characters embedded (`src/webview/offlineHanziData.ts`); all other characters fetched from jsDelivr CDN.
- **Storage:** `@/src/utils/storage` (AsyncStorage/IndexedDB), JSON-string values via `src/data/store.ts`.
- **Pinyin:** `pinyin-pro` (auto tone-marked). English glossary in `src/data/content.ts`.
- **Icons/mascots:** `@react-native-vector-icons/material-design-icons`. Fonts: Nunito (expo-font).
- **Design tokens:** `src/theme.ts` (Tactile/Playful LIGHT palette — mint/coral/mustard).

## User Personas
- **Child (3–8):** taps their avatar, picks a word list, traces characters, earns stars/badges.
- **Parent/Teacher:** PIN-protected; adds/edits/deletes word lists, manages kids, sets daily goal & PIN.

## Core Requirements (static)
1. PIN-locked Parent Mode with custom word list CRUD (paste → split into character cards).
2. Practice grid (米字格) with 3 modes: Demonstrate / Guided Trace / Test-Memory.
3. Pinyin + English + Pronounce (zh-CN / zh-HK selectable).
4. Gamification: 1–3 stars per char, confetti, ding/boing/fanfare sounds, mascot Prev/Next.
5. Per-kid profiles with avatars; daily practice goal + progress badges. Local persistence.

## Implemented (2026-06)
- Profile Picker (avatars, add kid, parent PIN gate).
- Kid Dashboard (daily goal ring, streak, 5 badges, word-list grid).
- Practice screen (WebView/iframe hanzi engine, 3 modes, pinyin/english, pronounce voice toggle, stars, shake on error, char-complete + list-complete celebrations, mascot nav).
- Parent Mode (list CRUD with icon picker + live preview, kid management, daily goal stepper, change PIN). Soft-delete for lists.
- Seeded: 1 kid (Mia) + 2 sample lists. Default PIN 1234.

## Backlog
- P1: Left-hand mode; adjustable stroke leniency per kid; per-character review history table in Parent Mode.
- P2: Multiple daily-goal types (words vs minutes); export/import lists; celebratory mascot animations (Lottie/Rive).

## Next Tasks
- Native device QA in Expo Go (WebView tracing, audio, speech) on a tablet.
