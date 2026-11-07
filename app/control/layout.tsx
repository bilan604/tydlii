import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./control-room.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Control room",
  robots: { index: false, follow: false, nocache: true },
};

export default function ControlLayout({ children }: { children: ReactNode }) {
  return <div className="cr-root">{children}</div>;
}
