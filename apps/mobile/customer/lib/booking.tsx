import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_DRAFT, upcomingDays, windowLabel, type Draft } from "@/lib/draft";
import { presentQuote } from "@/lib/present";

export type JobStatus = "enroute" | "cleaning" | "done";

export type Visit = {
  addressLine: string;
  area: string;
  when: string;
  summary: string;
  beforeHst: number;
  withHst: number;
  planBeforeHst: number | null;
  frequencyLabel: string;
  sample: boolean;
};

type BookingContextValue = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  visit: Visit | null;
  status: JobStatus;
  setStatus: (status: JobStatus) => void;
  confirm: () => void;
  previewSample: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [status, setStatus] = useState<JobStatus>("enroute");

  const value = useMemo<BookingContextValue>(() => {
    function update(patch: Partial<Draft>) {
      setDraft((current) => ({ ...current, ...patch }));
    }

    function confirm() {
      const presented = presentQuote(draft);
      if (presented.custom) return;
      const day = upcomingDays().find((item) => item.id === draft.dayId);
      const unit = draft.unit.trim();
      const address = draft.address.trim();
      setVisit({
        addressLine: unit ? `${address}, ${unit}` : address,
        area: draft.area,
        when: `${day?.label ?? "Scheduled"} · ${windowLabel(draft.windowId)}`,
        summary: `${presented.quote.bedrooms}-bedroom · ${presented.quote.label}`,
        beforeHst: presented.quote.first.beforeHst,
        withHst: presented.quote.first.withHst,
        planBeforeHst: presented.quote.plan?.beforeHst ?? null,
        frequencyLabel: presented.quote.frequencyLabel,
        sample: false,
      });
      setStatus("enroute");
    }

    function previewSample() {
      const presented = presentQuote({
        band: "C",
        bedrooms: 2,
        fullBaths: 1,
        halfBaths: 0,
        frequency: "biweekly",
        condition: "standard",
      });
      if (presented.custom || !presented.quote.plan) return;
      setVisit({
        addressLine: "88 Niagara Street, 1204",
        area: "Liberty Village",
        when: "Today · 9:00–10:00",
        summary: `${presented.quote.bedrooms}-bedroom · ${presented.quote.label}`,
        beforeHst: presented.headline.beforeHst,
        withHst: presented.headline.withHst,
        planBeforeHst: presented.quote.plan.beforeHst,
        frequencyLabel: presented.quote.frequencyLabel,
        sample: true,
      });
      setStatus("enroute");
    }

    return { draft, update, visit, status, setStatus, confirm, previewSample };
  }, [draft, visit, status]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const value = useContext(BookingContext);
  if (!value) throw new Error("useBooking must be used inside BookingProvider");
  return value;
}
