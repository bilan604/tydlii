import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  densify,
  LIBERTY_HOME,
  LIBERTY_ROUTE,
  VisitPlayback,
  type JobStatus,
  type VisitSnapshot,
} from "../../shared/src";
import { useSession, type Phase } from "@/lib/session";

const TICK_MS = 650;

type LiveVisitValue = {
  snapshot: VisitSnapshot | null;
  home: typeof LIBERTY_HOME;
  route: typeof LIBERTY_ROUTE;
  setStatus: (status: JobStatus) => void;
};

const LiveVisitContext = createContext<LiveVisitValue | null>(null);

export function phaseStatus(phase: Phase): JobStatus | null {
  if (phase === "navigating") return "enroute";
  if (phase === "arrived" || phase === "cleaning" || phase === "done") return phase;
  return null;
}

export function LiveVisitProvider({ children }: { children: ReactNode }) {
  const { phase, arrive, start, finish } = useSession();
  const inJob = phase === "navigating" || phase === "arrived" || phase === "cleaning" || phase === "done";
  const playbackRef = useRef<VisitPlayback | null>(null);
  const [snapshot, setSnapshot] = useState<VisitSnapshot | null>(null);

  useEffect(() => {
    if (!inJob) {
      playbackRef.current = null;
      setSnapshot(null);
      return;
    }
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
    };
  }, [inJob]);

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.status === "arrived" && phase === "navigating") arrive();
    else if (snapshot.status === "cleaning" && phase === "arrived") start();
    else if (snapshot.status === "done" && phase === "cleaning") finish();
  }, [snapshot, phase, arrive, start, finish]);

  function setStatus(status: JobStatus) {
    const playback = playbackRef.current;
    if (playback) {
      playback.setStatus(status);
      setSnapshot(playback.snapshot());
    }
    if (status === "arrived") arrive();
    if (status === "cleaning") start();
    if (status === "done") finish();
  }

  return (
    <LiveVisitContext.Provider value={{ snapshot, home: LIBERTY_HOME, route: LIBERTY_ROUTE, setStatus }}>
      {children}
    </LiveVisitContext.Provider>
  );
}

export function useCleanerLiveVisit(): LiveVisitValue {
  const value = useContext(LiveVisitContext);
  if (!value) throw new Error("useCleanerLiveVisit must be used inside LiveVisitProvider");
  return value;
}
