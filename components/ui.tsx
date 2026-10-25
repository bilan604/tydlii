import type { ReactNode } from "react";

export function SectionIntro({
  kicker,
  title,
  sub,
  center = false,
  titleId,
}: {
  kicker: string;
  title: string;
  sub?: string;
  center?: boolean;
  titleId?: string;
}) {
  return (
    <div className={center ? "section-intro is-center" : "section-intro"}>
      <p className="eyebrow">{kicker}</p>
      <h2 id={titleId}>{title}</h2>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

export function Check({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <div className={onDark ? "tick on-dark" : "tick"}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="11" fill="#20c7c7" />
        <path
          d="M6.5 11.3l3 3 6-6.3"
          fill="none"
          stroke={onDark ? "#0b2f6b" : "#ffffff"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}
