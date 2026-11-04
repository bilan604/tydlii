import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { MapChrome } from "@/components/MapChrome";
import { buildLiveMapHtml, liveMapCleanerMessage, type LatLng } from "../../shared/src";
import { colors } from "@/theme";

export function LiveVisitMap({
  home,
  cleaner,
  route,
  label,
}: {
  home: LatLng;
  cleaner: LatLng | null;
  route: LatLng[];
  label: string;
}) {
  const webRef = useRef<WebView>(null);
  const point = cleaner ?? route[0] ?? home;
  const latest = useRef(point);
  latest.current = point;
  const source = useRef({ html: buildLiveMapHtml({ home, route, cleaner: point }) }).current;

  function publish() {
    webRef.current?.postMessage(liveMapCleanerMessage(latest.current));
  }

  useEffect(() => {
    publish();
  }, [point.latitude, point.longitude]);

  return (
    <MapChrome label={label}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={source}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        onLoadEnd={publish}
      />
    </MapChrome>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: colors.mist },
});
