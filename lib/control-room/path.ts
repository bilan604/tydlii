import type { ControlView } from "./views";

export type ParsedControlPath = {
  mode: "owner" | "demo";
  view: ControlView;
  taskId?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function viewFrom(parts: string[]): ParsedControlPath["view"] | null | { view: "task"; taskId: string } {
  if (parts.length === 0) return "overview";
  const [head, second, third] = parts;
  if (head === "tasks" && parts.length === 1) return "tasks";
  if (head === "tasks" && parts.length === 2 && second && UUID.test(second)) return { view: "task", taskId: second.toLowerCase() };
  if (head === "handoffs" && parts.length === 1) return "handoffs";
  if (head === "approvals" && parts.length === 1) return "approvals";
  if (head === "activity" && parts.length === 1) return "activity";
  if (head === "settings" && parts.length === 1) return "settings";
  if (head === "sign-in" && parts.length === 1) return "sign-in";
  if (head === "business" && parts.length === 2 && second === "bookings") return "bookings";
  if (head === "business" && parts.length === 2 && second === "customers") return "customers";
  if (head === "business" && parts.length === 2 && second === "cleaners") return "cleaners";
  if (head === "business" && parts.length === 2 && second === "map") return "map";
  if (third) return null;
  return null;
}

export function parseControlPath(slug: string[] | undefined): ParsedControlPath | null {
  const parts = slug ?? [];
  if (parts[0] === "preview") {
    const rest = viewFrom(parts.slice(1));
    if (rest === "sign-in" || rest === null) return null;
    if (typeof rest === "object") return { mode: "demo", view: "task", taskId: rest.taskId };
    return { mode: "demo", view: rest };
  }
  const rest = viewFrom(parts);
  if (rest === null) return null;
  if (typeof rest === "object") return { mode: "owner", view: "task", taskId: rest.taskId };
  return { mode: "owner", view: rest };
}

export function controlHref(mode: "owner" | "demo", path = ""): string {
  const base = mode === "demo" ? "/control/preview" : "/control";
  return `${base}${path}`;
}
