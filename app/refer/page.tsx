import type { Metadata } from "next";
import { CopyReferral } from "@/components/CopyReferral";
import { Wordmark } from "@/components/Wordmark";
import { REFERRAL_CREDIT_PROMISE, normalizeReferralCode, referralShareUrl } from "@/lib/referral";
import { waitlistStore } from "@/lib/waitlist-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your referral link",
  robots: { index: false, follow: false },
};

export default async function ReferPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = normalizeReferralCode(params.code);
  const found = code ? await waitlistStore.lookupReferral(code) : { status: "missing" as const };
  const shareUrl = found.status === "found" ? referralShareUrl(found.code) : "";
  const firstName = found.status === "found" ? found.name.trim().split(/\s+/)[0] : "";

  return (
    <>
      <header className="refer-top shell">
        <a href="/" aria-label="Tydlii">
          <Wordmark className="refer-logo" />
        </a>
      </header>
      <main className="refer">
        <p className="eyebrow">Referral</p>
        {found.status === "found" ? (
          <>
            <h1>{firstName ? `${firstName}, your referral link.` : "Your referral link."}</h1>
            <p className="refer-lead">
              Share this link with a friend or family member. <strong>{REFERRAL_CREDIT_PROMISE}</strong>
            </p>
            <CopyReferral url={shareUrl} />
          </>
        ) : (
          <>
            <h1>
              {found.status === "unavailable"
                ? "Referral links are unavailable right now."
                : "That referral link isn't active."}
            </h1>
            <p className="refer-lead">
              {found.status === "unavailable"
                ? "Try the link from your welcome email again in a moment."
                : "Open the welcome email and tap Get your referral link."}{" "}
              <strong>{REFERRAL_CREDIT_PROMISE}</strong>
            </p>
            <a className="btn btn-navy" href="/">
              Back to Tydlii
            </a>
          </>
        )}
      </main>
    </>
  );
}
