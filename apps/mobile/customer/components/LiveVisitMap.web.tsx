import { createElement, useEffect, useRef } from "react";
import { MapChrome } from "@/components/MapChrome";
import { buildLiveMapHtml, liveMapCleanerMessage, type LatLng } from "../../shared/src";

type MapFrame = {
  contentWindow: { postMessage: (data: string, origin: string) => void } | null;
};

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
  const frame = useRef<MapFrame | null>(null);
  const ready = useRef(false);
  const point = cleaner ?? route[0] ?? home;
  const latest = useRef(point);
  latest.current = point;
  const html = useRef(buildLiveMapHtml({ home, route, cleaner: point })).current;

  function publish() {
    if (!ready.current) return;
    frame.current?.contentWindow?.postMessage(liveMapCleanerMessage(latest.current), "*");
  }

  useEffect(() => {
    publish();
  }, [point.latitude, point.longitude]);

  return (
    <MapChrome label={label}>
      {createElement("iframe", {
        title: label,
        srcDoc: html,
        ref: (node: MapFrame | null) => {
          frame.current = node;
        },
        onLoad: () => {
          ready.current = true;
          publish();
        },
        style: {
          border: "0",
          width: "100%",
          height: "100%",
          background: "#e5f3f4",
        },
      })}
    </MapChrome>
  );
}
