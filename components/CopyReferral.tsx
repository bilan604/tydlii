"use client";

import { useState } from "react";

export function CopyReferral({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="refer-actions">
      <label className="field">
        <span>Referral link</span>
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Referral link"
        />
      </label>
      <button className="btn btn-navy" type="button" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
