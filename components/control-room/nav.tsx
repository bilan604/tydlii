"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ControlView } from "@/lib/control-room/views";
import { controlHref } from "@/lib/control-room/path";

type Item = { href: string; label: string; view: ControlView };

export function ControlNav({ mode, view }: { mode: "owner" | "demo"; view: ControlView }) {
  const [open, setOpen] = useState<"work" | "business" | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const workId = useId();
  const businessId = useId();
  const work: Item[] = [
    { href: controlHref(mode), label: "Control room", view: "overview" },
    { href: controlHref(mode, "/tasks"), label: "Agents and tasks", view: "tasks" },
    { href: controlHref(mode, "/handoffs"), label: "Handoffs", view: "handoffs" },
    { href: controlHref(mode, "/approvals"), label: "Approvals", view: "approvals" },
    { href: controlHref(mode, "/activity"), label: "Activity", view: "activity" },
  ];
  const business: Item[] = [
    { href: controlHref(mode, "/business/bookings"), label: "Bookings", view: "bookings" },
    { href: controlHref(mode, "/business/customers"), label: "Customers", view: "customers" },
    { href: controlHref(mode, "/business/cleaners"), label: "Cleaners", view: "cleaners" },
    { href: controlHref(mode, "/business/map"), label: "Map", view: "map" },
  ];
  const settingsHref = controlHref(mode, "/settings");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    function onPointer(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  function menu(name: "work" | "business", label: string, id: string, items: Item[]) {
    const expanded = open === name;
    return (
      <div className="cr-menu">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setOpen(expanded ? null : name)}
        >
          {label}
          <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
        </button>
        {expanded ? (
          <div id={id} className="cr-dropdown" role="menu">
            {items.map((item) => (
              <a
                key={item.href}
                role="menuitem"
                href={item.href}
                aria-current={view === item.view || (item.view === "tasks" && view === "task") ? "page" : undefined}
                onClick={() => setOpen(null)}
              >
                {item.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <nav className="cr-nav" aria-label="Control room" ref={navRef}>
      {menu("work", "Work", workId, work)}
      {menu("business", "Business", businessId, business)}
      <a href={settingsHref} aria-current={view === "settings" ? "page" : undefined}>
        Settings
      </a>
    </nav>
  );
}
