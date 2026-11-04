import { useEffect, useRef, useState } from "react";
import {
  densify,
  LIBERTY_HOME,
  LIBERTY_ROUTE,
  VisitPlayback,
  type JobStatus,
  type VisitSnapshot,
} from "../../shared/src";

const TICK_MS = 650;

export function useLiveVisit(active: boolean) {
  const playbackRef = useRef<VisitPlayback | null>(null);
  const [snapshot, setSnapshot] = useState<VisitSnapshot | null>(null);

  useEffect(() => {
    if (!active) return;
    const playback = new VisitPlayback({
      route: densify(LIBERTY_ROUTE, 18),
      home: LIBERTY_HOME,
      holdTicks: 5,
    });
    playback.start();
    playbackRef.current = playback;
    setSnapshot(playback.step(Date.now()));
    const id = setInterval(() => {
      const next = playback.step(Date.now());
      setSnapshot(next);
      if (next.status === "done") clearInterval(id);
    }, TICK_MS);
    return () => {
      clearInterval(id);
      playback.stop();
      playbackRef.current = null;
    };
  }, [active]);

  function setStatus(status: JobStatus) {
    const playback = playbackRef.current;
    if (!playback) return;
    playback.setStatus(status);
    setSnapshot(playback.snapshot());
  }

  return { snapshot, setStatus, home: LIBERTY_HOME, route: LIBERTY_ROUTE };
}
