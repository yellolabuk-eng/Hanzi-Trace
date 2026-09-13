import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { buildHanziHtml } from "@/src/webview/hanziHtml";
import { makeStyles, useTheme } from "@/src/theme";
import type { HanziBoardHandle, HanziEvent, HanziMode } from "@/src/components/HanziBoard.types";

export type { HanziBoardHandle, HanziEvent, HanziMode } from "@/src/components/HanziBoard.types";

type Props = {
  char: string;
  mode: HanziMode;
  onEvent?: (evt: HanziEvent) => void;
};

// Web implementation: runs the exact same hanzi engine inside a same-origin
// srcDoc iframe (react-native-webview is native-only).
export const HanziBoard = forwardRef<HanziBoardHandle, Props>(function HanziBoardWeb(
  { char, mode, onEvent },
  ref,
) {
  const styles = useStyles();
  const { colors } = useTheme();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildHanziHtml(), []);

  const hz = useCallback((fn: (h: any) => void) => {
    const win = frameRef.current?.contentWindow as any;
    if (win && win.HZ) fn(win.HZ);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      speak: (c: string, lang: string) => hz((h) => h.speak(c, lang)),
      replay: () => hz((h) => h.replay()),
      reset: () => hz((h) => h.reset()),
      celebrate: () => hz((h) => h.celebrate()),
    }),
    [hz],
  );

  useEffect(() => {
    if (!ready || !char) return;
    hz((h) => h.load(char, mode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, char, mode]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (frameRef.current && e.source !== frameRef.current.contentWindow) return;
      let evt: HanziEvent | null = null;
      try {
        evt = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!evt) return;
      if (evt.type === "ready") setReady(true);
      onEvent?.(evt);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onEvent]);

  return (
    <View style={styles.container} testID="hanzi-board">
      {React.createElement("iframe", {
        ref: frameRef,
        srcDoc: html,
        style: { width: "100%", height: "100%", border: "none", background: colors.surfaceSecondary },
        title: "hanzi",
      })}
      {!ready && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      )}
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
  },
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
}));
