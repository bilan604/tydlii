"use client";

import { useEffect, useState } from "react";
import { SLOGANS } from "@/lib/site";

export function SloganRotator() {
  const [index, setIndex] = useState(0);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLOGANS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduce]);

  if (reduce) {
    return (
      <ul className="slogan-list">
        {SLOGANS.map((slogan) => (
          <li key={slogan}>{slogan}</li>
        ))}
      </ul>
    );
  }

  return (
    <p className="slogan" aria-live="polite">
      <span key={SLOGANS[index]} className="slogan-line">
        {SLOGANS[index]}
      </span>
    </p>
  );
}
