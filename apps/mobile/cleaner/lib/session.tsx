import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SAMPLE_OFFER } from "@/lib/sample-offer";

export type Phase = "idle" | "offer" | "navigating" | "arrived" | "cleaning" | "done";

export type Earning = {
  id: string;
  title: string;
  amount: number;
  detail: string;
};

type Session = {
  online: boolean;
  phase: Phase;
  declined: boolean;
  earnings: Earning[];
  recorded: boolean;
};

type SessionContextValue = Session & {
  busy: boolean;
  setOnline: (online: boolean) => void;
  accept: () => void;
  decline: () => void;
  showOffer: () => void;
  arrive: () => void;
  start: () => void;
  finish: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const INITIAL: Session = {
  online: false,
  phase: "idle",
  declined: false,
  earnings: [],
  recorded: false,
};

function isBusy(phase: Phase): boolean {
  return phase === "navigating" || phase === "arrived" || phase === "cleaning";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(INITIAL);

  const value = useMemo<SessionContextValue>(() => {
    return {
      ...session,
      busy: isBusy(session.phase),
      setOnline(next) {
        setSession((current) => {
          if (!next) {
            if (isBusy(current.phase)) return current;
            return {
              ...current,
              online: false,
              declined: false,
              phase: current.phase === "offer" ? "idle" : current.phase,
            };
          }
          if (isBusy(current.phase) || current.phase === "done") {
            return { ...current, online: true };
          }
          return { ...current, online: true, phase: "offer", declined: false };
        });
      },
      accept() {
        setSession((current) =>
          current.phase === "offer" ? { ...current, phase: "navigating", declined: false } : current,
        );
      },
      decline() {
        setSession((current) =>
          current.phase === "offer" ? { ...current, phase: "idle", declined: true, online: true } : current,
        );
      },
      showOffer() {
        setSession((current) => {
          if (isBusy(current.phase)) return current;
          return { ...current, online: true, phase: "offer", declined: false };
        });
      },
      arrive() {
        setSession((current) =>
          current.phase === "navigating" ? { ...current, phase: "arrived" } : current,
        );
      },
      start() {
        setSession((current) => (current.phase === "arrived" ? { ...current, phase: "cleaning" } : current));
      },
      finish() {
        setSession((current) => {
          if (current.phase !== "cleaning") return current;
          if (current.recorded) return { ...current, phase: "done" };
          return {
            ...current,
            phase: "done",
            recorded: true,
            earnings: [
              {
                id: "sample-larger-home",
                title: `${SAMPLE_OFFER.area} · ${SAMPLE_OFFER.home}`,
                amount: SAMPLE_OFFER.earn,
                detail: `${SAMPLE_OFFER.share} of $${SAMPLE_OFFER.price} before HST · ${SAMPLE_OFFER.shareGrown} path $${SAMPLE_OFFER.earnAt72.toFixed(2)}`,
              },
              ...current.earnings,
            ],
          };
        });
      },
    };
  }, [session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
