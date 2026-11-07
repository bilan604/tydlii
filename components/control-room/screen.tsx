import type { ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";
import type { AuthStatus } from "@/lib/control-room/auth";
import { allowedStatusLabels, agentName } from "@/lib/control-room/snapshot";
import type { Snapshot } from "@/lib/control-room/snapshot";
import { controlHref } from "@/lib/control-room/path";
import type { Approval, AuditEvent, Handoff, Task } from "@/lib/control-room/model";
import type { ControlView } from "@/lib/control-room/views";
import {
  ApprovalForm,
  DecisionButtons,
  HandoffForm,
  RecordTaskForm,
  SignInForm,
  SignOutButton,
  StatusForm,
} from "./forms";
import { MapPanel } from "./map-panel";
import { ControlNav } from "./nav";

type ScreenProps = {
  snapshot: Snapshot | null;
  view: ControlView;
  taskId?: string;
  authenticated: boolean;
  auth: AuthStatus;
};

function DisabledAction({ label, reason, id }: { label: string; reason: string; id: string }) {
  return (
    <div className="cr-action">
      <button className="cr-btn" type="button" disabled aria-describedby={id}>
        {label}
      </button>
      <p id={id} className="cr-reason">{reason}</p>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  return <span className="cr-badge">{source === "demo" ? "DEMO" : source === "founder" ? "Founder record" : source}</span>;
}

function TaskLink({ mode, task }: { mode: "owner" | "demo"; task: Pick<Task, "id" | "title" | "source"> }) {
  return (
    <a className="cr-link" href={controlHref(mode, `/tasks/${task.id}`)}>
      {task.title}
    </a>
  );
}

function EventList({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return <p className="cr-muted">No persisted events.</p>;
  return (
    <ol className="cr-list">
      {events.map((event) => (
        <li key={event.id} className="cr-card">
          <p className="cr-meta">{new Date(event.at).toLocaleString("en-CA", { timeZone: "America/Toronto" })} · {event.actor}</p>
          <p>{event.summary}</p>
          {event.kind === "cursor.status" ? <p className="cr-reason">Cloud agent status. Not a specialist handoff.</p> : null}
          {event.kind === "handoff.recorded" ? <p className="cr-reason">Notified: no</p> : null}
        </li>
      ))}
    </ol>
  );
}

function ApprovalCard({
  approval,
  mode,
  canDecide,
  reason,
}: {
  approval: Approval;
  mode: "owner" | "demo";
  canDecide: boolean;
  reason: string | null;
}) {
  return (
    <article className="cr-card">
      <p className="cr-meta">
        <SourceBadge source={approval.source} /> {approval.kind} · {approval.status} · {approval.execution === "fails_closed" ? "Fails closed" : "Record only"}
      </p>
      <h3>{approval.title}</h3>
      <p>{approval.detail}</p>
      <p className="cr-reason">{approval.executionReason}</p>
      {approval.status === "pending" ? (
        <DecisionButtons approvalId={approval.id} disabled={!canDecide || approval.source === "demo"} reason={approval.source === "demo" ? "DEMO preview cannot record a decision." : reason} />
      ) : (
        <p className="cr-meta">Decided {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString("en-CA", { timeZone: "America/Toronto" }) : ""}.</p>
      )}
      {approval.taskId ? <p className="cr-meta">Linked task is in this {mode === "demo" ? "DEMO" : "owner"} log.</p> : null}
    </article>
  );
}

function HandoffList({ handoffs, tasks, mode }: { handoffs: Handoff[]; tasks: Task[]; mode: "owner" | "demo" }) {
  if (handoffs.length === 0) return <p className="cr-muted">No handoffs recorded.</p>;
  return (
    <ol className="cr-list">
      {handoffs.map((handoff) => {
        const task = tasks.find((item) => item.id === handoff.taskId);
        return (
          <li key={handoff.id} className="cr-card">
            <p>
              {agentName(handoff.from)} → {agentName(handoff.to)}
            </p>
            <p className="cr-meta">{handoff.note || "No note."} · Notified: no · {handoff.actor}</p>
            {task ? <TaskLink mode={mode} task={task} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Shell({
  mode,
  view,
  fictional,
  bridge,
  authenticated,
  children,
}: {
  mode: "owner" | "demo";
  view: ControlView;
  fictional: boolean;
  bridge: string;
  authenticated: boolean;
  children: ReactNode;
}) {
  return (
    <div className="cr-shell">
      <a className="cr-skip" href="#cr-main">Skip to control room content</a>
      <header className="cr-top">
        <a className="cr-brand" href={controlHref(mode)}>
          <Wordmark variant="light" className="cr-logo" />
          <div>
            <p className="cr-kicker">Tydlii</p>
            <h1 className="cr-title">{fictional ? "DEMO control room" : "Control room"}</h1>
          </div>
        </a>
        <div className="cr-pills">
          <p className="cr-pill"><i /> <strong>{bridge}</strong></p>
          {authenticated ? <SignOutButton /> : null}
        </div>
      </header>
      {fictional ? (
        <p className="cr-banner" role="status">
          DEMO — fictional control-room records. Not live bookings, revenue, jobs, cleaner locations, or agent activity.
        </p>
      ) : null}
      <ControlNav mode={mode} view={view} />
      <main id="cr-main">{children}</main>
    </div>
  );
}

export function ControlScreen({ snapshot, view, taskId, authenticated, auth }: ScreenProps) {
  if (!snapshot || view === "sign-in") {
    return (
      <Shell mode="owner" view="sign-in" fictional={false} bridge="Owner gate" authenticated={false}>
        <section className="cr-panel">
          <h2>Owner sign-in</h2>
          <p>Private room for Tydlii only. Intake, Pipeline, and Desk are not connected.</p>
          <SignInForm configured={auth.configured} missing={auth.missing} />
          <p style={{ marginTop: 12 }}>
            <a className="cr-link" href="/control/preview">Open the labeled DEMO preview</a>
          </p>
        </section>
      </Shell>
    );
  }

  const mode = snapshot.mode;
  const locked = !snapshot.canRecord;
  const reason = snapshot.recordReason;
  const task = taskId ? snapshot.tasks.find((item) => item.id === taskId) : undefined;

  let body: ReactNode = null;
  if (view === "overview") body = <Overview snapshot={snapshot} />;
  else if (view === "tasks") {
    body = (
      <section className="cr-grid two">
        <div className="cr-panel">
          <h2>Agents and tasks</h2>
          <TaskList tasks={snapshot.tasks} mode={mode} />
        </div>
        <div className="cr-panel">
          <h2>Record a task</h2>
          <RecordTaskForm disabled={locked} reason={reason} tasks={snapshot.tasks} />
        </div>
      </section>
    );
  } else if (view === "task" && task) {
    body = <TaskDetail snapshot={snapshot} task={task} locked={locked} reason={reason} />;
  } else if (view === "handoffs") {
    body = (
      <section className="cr-grid two">
        <div className="cr-panel">
          <h2>Handoffs</h2>
          <HandoffList handoffs={[...snapshot.handoffs].reverse()} tasks={snapshot.tasks} mode={mode} />
        </div>
        <div className="cr-panel">
          <h2>Record a handoff</h2>
          <HandoffForm disabled={locked} reason={reason} tasks={snapshot.tasks} />
        </div>
      </section>
    );
  } else if (view === "approvals") {
    body = (
      <section className="cr-grid two">
        <div className="cr-panel">
          <h2>Approvals</h2>
          <div className="cr-list">
            {snapshot.approvals.length === 0 ? <p className="cr-muted">No decisions recorded.</p> : snapshot.approvals.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} mode={mode} canDecide={!locked} reason={reason} />
            ))}
          </div>
        </div>
        <div className="cr-panel">
          <h2>Request a decision</h2>
          <ApprovalForm disabled={locked} reason={reason} tasks={snapshot.tasks} />
        </div>
      </section>
    );
  } else if (view === "activity") {
    body = (
      <section className="cr-panel">
        <h2>Activity</h2>
        <p className="cr-reason">{snapshot.persistenceDetail}</p>
        <EventList events={snapshot.events} />
      </section>
    );
  } else if (view === "bookings") body = <Bookings />;
  else if (view === "customers") body = <People snapshot={snapshot} kind="customers" />;
  else if (view === "cleaners") body = <People snapshot={snapshot} kind="cleaners" />;
  else if (view === "map") {
    body = (
      <section className="cr-panel">
        <h2>Coverage map</h2>
        <MapPanel cities={snapshot.geography.cities} neighbourhoods={snapshot.geography.neighbourhoods} liveGps={snapshot.geography.liveGps} />
      </section>
    );
  } else if (view === "settings") body = <Settings snapshot={snapshot} />;

  return (
    <Shell mode={mode} view={view} fictional={snapshot.fictional} bridge={snapshot.bridge.state === "listening" ? "Status webhook listening" : "Agent bridge disconnected"} authenticated={authenticated}>
      {body}
    </Shell>
  );
}

function Overview({ snapshot }: { snapshot: Snapshot }) {
  const dashboard = snapshot.readiness.filter((item) => item.track === "dashboard" && item.state !== "ready");
  return (
    <div className="cr-stage">
      <section className="cr-rail" aria-label="Specialist desks">
        {snapshot.agents.map((agent) => (
          <article key={agent.id} className={agent.holding ? "cr-station is-holding" : "cr-station"}>
            <p className="cr-badge">Disconnected</p>
            <h2>{agent.name}</h2>
            <p className="cr-muted">{agent.duty}</p>
            {agent.holding ? (
              <p style={{ marginTop: 8 }}>
                <SourceBadge source={agent.holding.source} />{" "}
                <a className="cr-link" href={controlHref(snapshot.mode, `/tasks/${agent.holding.id}`)}>{agent.holding.title}</a>
                <span className="cr-muted"> · {agent.holding.status}</span>
              </p>
            ) : (
              <p className="cr-reason" style={{ marginTop: 8 }}>No persisted assignment.</p>
            )}
          </article>
        ))}
      </section>
      <section className="cr-panel">
        <h2>Coverage</h2>
        <MapPanel cities={snapshot.geography.cities} neighbourhoods={snapshot.geography.neighbourhoods} liveGps={snapshot.geography.liveGps} />
      </section>
      <div className="cr-stack">
        <section className="cr-panel">
          <h2>Open decisions</h2>
          {snapshot.approvals.filter((item) => item.status === "pending").length === 0 ? (
            <p className="cr-muted">None recorded.</p>
          ) : (
            snapshot.approvals.filter((item) => item.status === "pending").map((approval) => (
              <p key={approval.id}><SourceBadge source={approval.source} /> {approval.title}</p>
            ))
          )}
          <p style={{ marginTop: 8 }}><a className="cr-link" href={controlHref(snapshot.mode, "/approvals")}>Approvals</a></p>
        </section>
        <section className="cr-panel">
          <h2>Latest activity</h2>
          <EventList events={snapshot.events.slice(0, 3)} />
        </section>
        <section className="cr-panel">
          <h2>Dashboard gaps</h2>
          <ul className="cr-list">
            {dashboard.slice(0, 4).map((item) => (
              <li key={item.id}><strong>{item.area}.</strong> <span className="cr-muted">{item.state}. {item.finding}</span></li>
            ))}
          </ul>
          <p style={{ marginTop: 8 }}><a className="cr-link" href={controlHref(snapshot.mode, "/settings")}>Full readiness</a></p>
        </section>
      </div>
    </div>
  );
}

function TaskList({ tasks, mode }: { tasks: Task[]; mode: "owner" | "demo" }) {
  if (tasks.length === 0) return <p className="cr-muted">No persisted tasks. Idle desks are not live agents.</p>;
  return (
    <ul className="cr-list">
      {tasks.map((task) => (
        <li key={task.id} className="cr-card">
          <p className="cr-meta"><SourceBadge source={task.source} /> {task.status} · {agentName(task.holder)}</p>
          <h3><TaskLink mode={mode} task={task} /></h3>
          <p>{task.summary || "No summary."}</p>
        </li>
      ))}
    </ul>
  );
}

function TaskDetail({ snapshot, task, locked, reason }: { snapshot: Snapshot; task: Task; locked: boolean; reason: string | null }) {
  const deps = task.dependsOn.map((id) => snapshot.tasks.find((item) => item.id === id)).filter((item): item is Task => Boolean(item));
  return (
    <section className="cr-grid two">
      <article className="cr-panel">
        <p className="cr-meta"><SourceBadge source={task.source} /> {snapshot.labels.status[task.status]} · {agentName(task.holder)}</p>
        <h2>{task.title}</h2>
        <p>{task.summary || "No summary."}</p>
        <p className="cr-meta" style={{ marginTop: 8 }}>
          {task.neighbourhood ? `Coverage note: ${task.neighbourhood}. ` : ""}
          Updated {new Date(task.updatedAt).toLocaleString("en-CA", { timeZone: "America/Toronto" })}.
        </p>
        <h3 style={{ marginTop: 16 }}>Dependencies</h3>
        {deps.length === 0 ? <p className="cr-muted">None.</p> : (
          <ul>{deps.map((dep) => <li key={dep.id}>{dep.title} · {snapshot.labels.status[dep.status]}</li>)}</ul>
        )}
        <h3 style={{ marginTop: 16 }}>Events for this task</h3>
        <EventList events={snapshot.events.filter((event) => event.taskId === task.id)} />
      </article>
      <div className="cr-stack">
        <section className="cr-panel">
          <h2>Status</h2>
          <StatusForm taskId={task.id} options={allowedStatusLabels(task.status)} disabled={locked || task.source === "demo"} reason={task.source === "demo" ? "DEMO records are read-only." : reason} />
        </section>
        <section className="cr-panel">
          <h2>Handoff</h2>
          <HandoffForm disabled={locked || task.source === "demo"} reason={task.source === "demo" ? "DEMO records are read-only." : reason} tasks={[task]} />
        </section>
      </div>
    </section>
  );
}

function Bookings() {
  return (
    <section className="cr-panel">
      <h2>Bookings</h2>
      <p className="cr-badge">Disconnected</p>
      <p style={{ marginTop: 8 }}>No booking store. A quote on the website is not a job, and this room has no revenue ledger.</p>
      <div className="cr-actions">
        <DisabledAction id="dispatch" label="Dispatch a cleaner" reason="Disconnected. There is no job to dispatch." />
        <DisabledAction id="charge" label="Charge a card" reason="Disconnected. Live Stripe is gated and this room cannot create a charge." />
        <DisabledAction id="message-customer" label="Message a customer" reason="Disconnected. This room does not send external messages." />
      </div>
    </section>
  );
}

function People({ snapshot, kind }: { snapshot: Snapshot; kind: "customers" | "cleaners" }) {
  const waitlist = snapshot.waitlist;
  const fictional = snapshot.fictional;
  return (
    <section className="cr-panel">
      <h2>{kind === "customers" ? "Customers" : "Cleaners"}</h2>
      {fictional ? <p className="cr-banner">DEMO fixture counts. Not the waitlist file and not revenue.</p> : null}
      {waitlist.status !== "ok" ? (
        <p className="cr-reason">{waitlist.reason}</p>
      ) : (
        <>
          <p>
            {kind === "customers" ? waitlist.confirmedCustomers : waitlist.confirmedCleaners} confirmed{" "}
            {kind === "customers" ? "customer" : "cleaner"} {fictional ? "DEMO rows" : "rows on the waitlist file"}.
            {fictional ? "" : ` ${waitlist.unconfirmedReserves} unconfirmed reserves are not listed.`}
          </p>
          <ul className="cr-list">
            {waitlist.neighbourhoods.map((area) => (
              <li key={area.name}>{area.name}: {kind === "customers" ? area.customers : area.cleaners}</li>
            ))}
          </ul>
          <p className="cr-reason">Names, emails, phones, notes, and quotes are not shown.</p>
        </>
      )}
      {kind === "customers" ? (
        <DisabledAction id="email-customer" label="Email a customer" reason="Disconnected. Outbound mail is not a control-room action. The inbox is teamtydlii@gmail.com." />
      ) : (
        <>
          <p className="cr-reason" style={{ marginTop: 12 }}>
            The public onboarding form is the current pipeline input. Opening it does not review or approve anyone.
          </p>
          <p style={{ marginTop: 8 }}><a className="cr-link" href={snapshot.onboardingFormUrl}>Public onboarding form</a></p>
          <DisabledAction id="approve-cleaner" label="Approve cleaner" reason="Disconnected. Cleaner approval fails closed. There is no review integration." />
        </>
      )}
    </section>
  );
}

function Settings({ snapshot }: { snapshot: Snapshot }) {
  const dashboard = snapshot.readiness.filter((item) => item.track === "dashboard");
  const launch = snapshot.readiness.filter((item) => item.track === "app-launch");
  return (
    <div className="cr-stack">
      <section className="cr-panel">
        <h2>Connections</h2>
        <table className="cr-table">
          <thead><tr><th>Source</th><th>State</th><th>Detail</th></tr></thead>
          <tbody>
            {snapshot.connections.map((row) => (
              <tr key={row.id}><td>{row.label}</td><td>{row.state}</td><td>{row.detail}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="cr-reason" style={{ marginTop: 12 }}>{snapshot.bridge.accepts}</p>
        <ul>{snapshot.bridge.doesNotDo.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="cr-panel">
        <h2>Mail</h2>
        <p>Business inbox: {snapshot.inbox}. Outbound welcome mail uses the EMAIL_FROM variable as From only. This room cannot send either.</p>
      </section>
      <section className="cr-panel">
        <h2>Hosting, not deployed from here</h2>
        <ul className="cr-list">
          {snapshot.hosting.map((option) => (
            <li key={option.id}><strong>{option.title}.</strong> {option.body}</li>
          ))}
        </ul>
      </section>
      <section className="cr-panel">
        <h2>Dashboard blockers</h2>
        <ReadinessTable items={dashboard} />
      </section>
      <section className="cr-panel">
        <h2>App launch tasks</h2>
        <p className="cr-reason">These are store and phone tasks. They do not make the agent desks live.</p>
        <ReadinessTable items={launch} />
      </section>
    </div>
  );
}

function ReadinessTable({ items }: { items: Snapshot["readiness"] }) {
  return (
    <table className="cr-table">
      <thead><tr><th>Area</th><th>State</th><th>Finding</th><th>Next</th></tr></thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.area}</td>
            <td>{item.state}</td>
            <td>{item.finding}</td>
            <td>{item.next}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
