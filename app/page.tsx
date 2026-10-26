import { Landing } from "@/components/Landing";
import { configuredAccessKey } from "@/lib/waitlist-notify";

export default function HomePage() {
  return (
    <main className="shell">
      <Landing accessKey={configuredAccessKey(process.env.WAITLIST_WEB3FORMS_ACCESS_KEY)} />
    </main>
  );
}
