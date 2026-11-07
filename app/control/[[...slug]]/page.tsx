import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ControlScreen } from "@/components/control-room/screen";
import { authStatus, SESSION_COOKIE, verifySession } from "@/lib/control-room/auth";
import { parseControlPath } from "@/lib/control-room/path";
import { demoSnapshot, ownerSnapshot } from "@/lib/control-room/snapshot";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseControlPath(slug);
  const demo = parsed?.mode === "demo";
  return {
    title: demo ? "DEMO control room" : "Control room",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ControlPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const parsed = parseControlPath(slug);
  if (!parsed) notFound();
  const auth = authStatus();

  if (parsed.mode === "demo") {
    const snapshot = await demoSnapshot();
    if (parsed.view === "task" && !snapshot.tasks.some((task) => task.id === parsed.taskId)) notFound();
    return <ControlScreen snapshot={snapshot} view={parsed.view} taskId={parsed.taskId} authenticated={false} auth={auth} />;
  }

  const jar = await cookies();
  const authenticated = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (authenticated && parsed.view === "sign-in") redirect("/control");
  if (!authenticated) {
    return <ControlScreen snapshot={null} view="sign-in" authenticated={false} auth={auth} />;
  }
  const snapshot = await ownerSnapshot();
  if (parsed.view === "task" && !snapshot.tasks.some((task) => task.id === parsed.taskId)) notFound();
  return (
    <ControlScreen
      snapshot={snapshot}
      view={parsed.view}
      taskId={parsed.taskId}
      authenticated
      auth={auth}
    />
  );
}
