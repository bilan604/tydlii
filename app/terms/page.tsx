import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/LegalDocument";
import { LEGAL_EMAIL, TERMS_UPDATED } from "@/lib/legal";
import { REFERRAL_CREDIT_PROMISE } from "@/lib/referral";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using Tydlii, the Toronto cleaning marketplace. The website is a waitlist. Paid booking is not open yet.",
  alternates: { canonical: "/terms" },
  openGraph: {
    url: "/terms",
    title: "Terms of Service · Tydlii",
    description:
      "The terms for using Tydlii. The website is a waitlist. Paid booking is not open yet.",
  },
};

export default function TermsPage() {
  return (
    <LegalDocument
      current="terms"
      kicker="Terms"
      title="Terms of Service"
      lede="The rules for using Tydlii. The website is a waitlist. Paid booking is not open yet."
      updated={TERMS_UPDATED}
    >
      <LegalSection title="Using Tydlii">
        <p>
          These terms cover tydlii.com, the Tydlii customer app, and the Tydlii cleaner app. Using them means
          these terms apply, along with the <a href="/privacy">privacy policy</a>. If you do not agree, do not
          use them.
        </p>
        <p>
          The waitlist checkbox is permission for us to contact you about the launch. It is not a booking, and
          it is not a contract for a clean. These terms do not take away rights you have under the laws of
          Ontario or Canada.
        </p>
        <p>This version is dated {TERMS_UPDATED}. Tydlii operates from Toronto, Ontario, Canada.</p>
      </LegalSection>

      <LegalSection title="The waitlist is not a booking">
        <p>
          Tydlii connects people who want a home cleaned with cleaners who do that work. The pilot opens in
          CityPlace, King West, and Liberty Village, then other Toronto neighbourhoods. We are not taking
          bookings yet. Joining the list does not reserve a cleaner or a time. Waitlist members hear first.
        </p>
      </LegalSection>

      <LegalSection title="Prices">
        <p>
          The price on the site is an instant quote from the home you describe: bedrooms, bathrooms, square
          footage, how often, and the condition. We show it before HST, and again with 13% Ontario HST.
        </p>
        <p>
          When booking is open, that price is locked for the home you described. If the home is materially
          different from what you booked, we contact you before the clean starts. HST is added at checkout. The
          price you accept on the booking screen is the price for that visit.
        </p>
      </LegalSection>

      <LegalSection title="The clean">
        <p>Once paid booking is open, a visit includes these promises from the website:</p>
        <ul>
          <li>
            A Tydlii-certified cleaner comes in the window you book. Certified means background-checked,
            ID-verified, trained to the Tydlii Standard, and insured. It is a cleaner for that visit, not a
            promise of the same person every time
          </li>
          <li>The arrival window is one hour. You can follow the visit while it is active</li>
          <li>
            If we miss something on the Tydlii Standard for the visit you booked, tell us within 48 hours and we
            re-clean that part within 24 hours, at no extra charge. The limits are in{" "}
            <a href="#re-cleans">Re-cleans</a>
          </li>
          <li>
            If the cleaner is late for the arrival window, Tydlii credits the customer. That credit is not taken
            from the cleaner’s pay. The amount will be shown before you pay for a visit
          </li>
        </ul>
        <p>
          A cleaner can stop a job for safety and still be paid for that visit. Re-cleans and late-arrival
          credits are paid by Tydlii.
        </p>
      </LegalSection>

      <LegalSection id="re-cleans" title="Re-cleans">
        <p>
          A free re-clean applies when we miss something on the Tydlii Standard for the visit you booked. Tell
          us within 48 hours of that visit by emailing{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. We re-clean what was missed within 24 hours of
          your message. There is no extra charge, and the price you already accepted does not change.
        </p>
        <p>
          It does not cover a new mess made after we leave. It does not cover extras that were not in the
          booked scope, such as another room or an add-on that was not on the booking. If the home is
          materially different from what you booked, we contact you before any further work, as described under
          Prices.
        </p>
        <p>
          The re-clean is for a genuine miss. We may refuse a request that is outside this promise, including
          repeat abuse: a pattern of requests from the same account that are not a miss on the Standard. We
          will tell you why. A genuine miss on a visit we did is still covered.
        </p>
      </LegalSection>

      <LegalSection title="The apps">
        <p>
          The customer app and the cleaner app link to these terms and to the privacy policy. Builds before
          launch use sample visits. A sample screen does not charge a card, does not pay earnings, and is not a
          booking.
        </p>
      </LegalSection>

      <LegalSection title="Payment and cleaner pay">
        <p>
          We do not take payment details on the waitlist. When paid booking opens, customers pay through Stripe
          for the quoted visit, including HST. Tydlii does not store the full card number.
        </p>
        <p>
          A cleaner sees the dollar share before accepting a job. The site describes a 67% share of the job
          price from day one, rising to 72%, plus 100% of tips. Daily pay starts when that program is live.
          Nothing in the current apps is a payout.
        </p>
        <p>
          We will state the working relationship, including how a cleaner is engaged and how tax is handled,
          before the first paid job. Do not treat the sample screens as that statement.
        </p>
      </LegalSection>

      <LegalSection title="Location">
        <p>
          On a live job, the cleaner app uses location only while the job is active, and only while the app is
          in use, as described in the <a href="/privacy#location">privacy policy</a>. Tracking stops when the
          job is marked Done. The customer app does not collect location.
        </p>
      </LegalSection>

      <LegalSection title="Referrals">
        <p>{REFERRAL_CREDIT_PROMISE}</p>
        <p>
          The friend’s $25 is a discount on the first booking. It is not cash. The referrer’s $25 is account
          credit, not cash, and it applies only after that friend’s first clean is paid. One email cannot refer
          itself. A cleaner signup is not part of the offer. The discount and the credit apply when booking is
          open. They have no cash value.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and deletion">
        <p>
          You are responsible for the details you send us. They need to be accurate enough for us to reach you
          and, later, to find the home. You can ask us to delete a waitlist record or an account as described in
          the <a href="/privacy#delete-account">privacy policy</a>. Email{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
        </p>
        <p>
          When sign-in exists, each app will include a delete-account control. Until that control is connected,
          email is how you ask.
        </p>
      </LegalSection>

      <LegalSection title="Cancellations">
        <p>
          There is nothing to cancel yet, because we are not taking bookings. Before the first paid booking, the
          app will show how to cancel or change a visit, including any window where a fee could apply. We will
          not charge a cancellation fee that was not shown before you booked.
        </p>
      </LegalSection>

      <LegalSection title="Your part">
        <p>When you use Tydlii, you agree to:</p>
        <ul>
          <li>Give information you have a right to give</li>
          <li>Use the site and the apps for booking or doing a clean, not to interfere with them</li>
          <li>Treat the cleaner and the customer safely. A visit can be refused or stopped if it is not safe</li>
          <li>Be 18 or older</li>
        </ul>
        <p>We can close a waitlist signup or refuse a job we cannot do safely.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We can update these terms by posting a new version on this page with a new date. If you have an
          account and the change is significant, we will email you. If a booking screen you accept names a
          specific price or time, that screen is the one for that visit.
        </p>
      </LegalSection>

      <LegalSection title="The law that applies">
        <p>
          These terms are governed by the laws of Ontario and the federal laws of Canada that apply here.
          Disputes are handled in Toronto, Ontario. Rights you have as a consumer under those laws still apply.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Email <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. Tydlii, Toronto, Ontario, Canada.
        </p>
        <p>
          <a className="btn btn-navy" href="/">
            Back to Tydlii
          </a>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
