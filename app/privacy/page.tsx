import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/LegalDocument";
import { LEGAL_EMAIL, LEGAL_UPDATED, LOCATION_PURPOSE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tydlii handles personal information on tydlii.com and in the customer and cleaner apps. Location is used only during an active cleaner job.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    url: "/privacy",
    title: "Privacy Policy · Tydlii",
    description:
      "How Tydlii handles personal information on tydlii.com and in the customer and cleaner apps.",
  },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      current="privacy"
      kicker="Privacy"
      title="Privacy Policy"
      lede="How Tydlii handles personal information on the website and in the customer and cleaner apps."
    >
      <LegalSection title="The short version">
        <p>
          Tydlii is a cleaning marketplace in Toronto. The website is a waitlist. Paid booking is not open yet.
          The apps are being prepared for the App Store and Google Play. Today we collect what you type to join
          the list. When live jobs start, the cleaner app uses location only during that job, and only while the
          app is in use.
        </p>
        <p>
          We do not sell personal information. Questions and deletion requests go to{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. The terms are on{" "}
          <a href="/terms">tydlii.com/terms</a>.
        </p>
      </LegalSection>

      <LegalSection title="Who this covers">
        <p>
          This policy is for tydlii.com, the Tydlii customer app, and the Tydlii cleaner app. Tydlii operates from
          Toronto, Ontario, Canada. It applies to customers, cleaners, and anyone who joins the waitlist.
        </p>
        <p>This version is dated {LEGAL_UPDATED}.</p>
      </LegalSection>

      <LegalSection title="What we collect on the waitlist">
        <p>If you join the list, we store:</p>
        <ul>
          <li>Whether you need cleaning or want to clean</li>
          <li>Your name and email</li>
          <li>Your phone number, if you add one</li>
          <li>Your neighbourhood. Customers pick one. Cleaners can pick more than one</li>
          <li>A note, if you write one</li>
          <li>
            For customers, the quote on the page: home size, bedrooms, bathrooms, frequency, condition, and the
            price before HST and with HST
          </li>
          <li>That you agreed to be contacted about the launch</li>
          <li>A referral code, if you opened a referral link</li>
          <li>The time you joined</li>
        </ul>
        <p>
          The form has a hidden field that catches automated signups. Leave it blank. We do not ask for a card
          number on this website.
        </p>
        <p>
          A customer welcome email and a cleaner onboarding email are sent when mail delivery is turned on. The
          signup is also delivered to the Tydlii team inbox. Cleaners who tap Start onboarding fill in a Google
          Form we link to. What you submit there is covered by this policy.
        </p>
      </LegalSection>

      <LegalSection title="What the apps collect">
        <p>
          The current customer and cleaner builds use sample visits. They do not read your location, charge a
          card, or pay earnings.
        </p>
        <p>When accounts and live jobs are on, a booking can include:</p>
        <ul>
          <li>Your name, email, and phone</li>
          <li>The address, home details, arrival window, and notes for that visit</li>
          <li>The locked price</li>
          <li>Visit status, and photos or a checklist if the app asks for them before the visit</li>
        </ul>
        <p>
          A cleaner profile can include your name, contact details, the areas you work, and the onboarding
          details you send us.
        </p>
      </LegalSection>

      <LegalSection id="location" title="Location">
        <p>{LOCATION_PURPOSE}</p>
        <p>
          That applies to the cleaner app, and only so the customer on that job can follow the visit. The
          customer app does not collect location. If location is off, the cleaner can still mark the visit, and
          the customer still sees the status.
        </p>
        <p>
          We do not ask for background location. The watch is when-in-use, for an active job only. When the job
          is marked Done, collection stops. A record that the visit happened, including status and time, can stay
          with the booking.
        </p>
      </LegalSection>

      <LegalSection title="Payment">
        <p>
          The waitlist does not take payment details. When paid booking opens, customers pay through Stripe,
          including HST. Tydlii does not store your full card number. Stripe processes the card. Cleaner payouts
          will use the same payment provider when that program is live.
        </p>
      </LegalSection>

      <LegalSection title="How we use it, and who sees it">
        <p>We use this information to:</p>
        <ul>
          <li>Keep the waitlist and tell you when booking opens in your area</li>
          <li>Send the referral link you asked for</li>
          <li>Quote a clean and, later, book it and show the visit</li>
          <li>Pay for a visit through Stripe, and pay a cleaner their share, once payments are on</li>
          <li>Handle a re-clean or a late-arrival credit once those are live</li>
          <li>Answer a request you send us, and keep the service safe</li>
        </ul>
        <p>We share it only as needed for that work:</p>
        <ul>
          <li>
            The cleaner on a visit sees the home details required to do the job. The customer sees that a Tydlii
            cleaner is on the way during that visit. We do not promise the same cleaner every time
          </li>
          <li>Web3Forms delivers the waitlist signup to our team inbox</li>
          <li>Resend sends welcome and onboarding email when it is configured</li>
          <li>Google hosts the cleaner onboarding form</li>
          <li>The site is hosted so it can run. Production hosting is Render</li>
          <li>Stripe, when payments start</li>
          <li>A provider who stores or sends this information for us</li>
          <li>Someone the law requires us to tell</li>
        </ul>
        <p>
          Those providers may store information outside Canada, including in the United States. We do not sell
          personal information, and we do not share it for other companies’ ads.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep waitlist details until you ask us to delete them, or until we no longer need them to open the
          service and contact people who joined. Booking records, once they exist, stay for the visit, for
          payment, and for a period after that so we can handle a re-clean, a dispute, or a tax record. We do
          not keep collecting location after the job is Done.
        </p>
      </LegalSection>

      <LegalSection id="delete-account" title="Access, correction, and deletion">
        <p>
          You can ask what we hold, ask us to fix it, or ask us to delete it. Email{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> from the address you used. We delete the waitlist
          record for that email, including a referral code on that signup.
        </p>
        <p>
          When sign-in exists, the customer app and the cleaner app will each include a delete-account control.
          Deleting the account removes the profile and signs that device out. Until that control is connected,
          email is how you ask. You can also start from{" "}
          <a href="/privacy#delete-account">this section on tydlii.com/privacy</a>.
        </p>
        <p>
          If a law, a tax record, or an open payment dispute requires us to keep part of a record, we keep that
          part and delete the rest. A copy can remain in an email inbox until that message is cleared.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Tydlii is for people booking a clean or doing the work. You need to be 18 or older to join. We do not
          knowingly collect information from children.
        </p>
      </LegalSection>

      <LegalSection title="This browser">
        <p>
          The marketing site does not use advertising cookies. If you open a referral link, this browser tab can
          remember the code so the form can attach it. That stays on your device for the tab. It is not an ad
          profile.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes, we post the new version on this page and update the date. If the change is
          significant and we have your email, we will tell you.
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
