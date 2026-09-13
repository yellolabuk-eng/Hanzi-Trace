import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";

import { buildHanziHtml } from "@/src/webview/hanziHtml";
import { makeStyles, useTheme } from "@/src/theme";
import type { HanziBoardHandle, HanziEvent, HanziMode } from "@/src/components/HanziBoard.types";

export type { HanziBoardHandle, HanziEvent, HanziMode } from "@/src/components/HanziBoard.types";

type Props = {
  char: string;
  mode: HanziMode;
  onEvent?: (evt: HanziEvent) => void;
};

export const HanziBoard = forwardRef<HanziBoardHandle, Props>(function HanziBoard(
  { char, mode, onEvent },
  ref,
) {
  const styles = useStyles();
  const { colors } = useTheme();
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildHanziHtml(), []);

  const inject = useCallback((js: string) => {
    webRef.current?.injectJavaScript(js + "; true;");
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      speak: (c: string, lang: string) =>
        inject(`window.HZ && window.HZ.speak(${JSON.stringify(c)}, ${JSON.stringify(lang)});`),
      replay: () => inject(`window.HZ && window.HZ.replay();`),
      reset: () => inject(`window.HZ && window.HZ.reset();`),
      celebrate: () => inject(`window.HZ && window.HZ.celebrate();`),
    }),
    [inject],
  );

  // Load / reload the character whenever it (or the mode) changes and the engine is ready.
  useEffect(() => {
    if (!ready || !char) return;
    inject(`window.HZ && window.HZ.load(${JSON.stringify(char)}, ${JSON.stringify(mode)});`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, char, mode]);

  const handleMessage = useCallback(
    (e: { nativeEvent: { data: string } }) => {
      let evt: HanziEvent | null = null;
      try {
        evt = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (!evt) return;
      if (evt.type === "ready") setReady(true);
      onEvent?.(evt);
    },
    [onEvent],
  );

  return (
    <View style={styles.container} testID="hanzi-board">
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        androidLayerType="hardware"
        style={styles.web}
        containerStyle={styles.web}
      />
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
  web: {
    flex: 1,
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
