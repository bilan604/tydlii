"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AREAS } from "@/lib/areas";
import { AGENTS, APPROVAL_KINDS, KIND_LABEL, LANES, LANE_LABEL } from "@/lib/control-room/model";
import type { Task } from "@/lib/control-room/model";

async function postJson(path: string, body: unknown, method = "POST") {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json", "x-tydlii-control": "1" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string; notice?: string } | null;
  return { ok: response.ok, error: payload?.error ?? "The control room did not answer.", notice: payload?.notice ?? "" };
}

function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  if (error) return <p className="cr-alert" role="alert">{error}</p>;
  if (notice) return <p role="status">{notice}</p>;
  return null;
}

export function SignInForm({ configured, missing }: { configured: boolean; missing: string[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reason = configured
    ? "This checks the owner password on the server. It does not open Cursor or message a specialist."
    : `Sign-in is disconnected. Set ${missing.join(" and ")} on the server. Nothing is hardcoded here.`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || pending) return;
    setPending(true);
    setError(null);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const result = await postJson("/api/control/session", { password });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/control");
    router.refresh();
  }

  return (
    <form className="cr-form" onSubmit={onSubmit}>
      <label className="cr-label">
        Owner password
        <input className="cr-field" name="password" type="password" autoComplete="current-password" disabled={!configured || pending} required={configured} />
      </label>
      <button className="cr-btn cr-btn-primary" type="submit" disabled={!configured || pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
      <p className="cr-reason">{reason}</p>
      <Feedback error={error} notice={null} />
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch("/api/control/session", { method: "DELETE", headers: { "x-tydlii-control": "1" } });
    router.push("/control/sign-in");
    router.refresh();
  }

  return (
    <button className="cr-btn" type="button" onClick={signOut} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function RecordTaskForm({ disabled, reason, tasks }: { disabled: boolean; reason: string | null; tasks: Task[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const result = await postJson("/api/control/tasks", {
      title: form.get("title"),
      summary: form.get("summary"),
      lane: form.get("lane"),
      neighbourhood: form.get("neighbourhood"),
      dependsOn: form.getAll("dependsOn"),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(result.notice);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="cr-form" onSubmit={onSubmit}>
      <label className="cr-label">
        Title
        <input className="cr-field" name="title" maxLength={120} disabled={disabled || pending} required={!disabled} />
      </label>
      <label className="cr-label">
        Summary
        <textarea className="cr-field" name="summary" maxLength={500} rows={3} disabled={disabled || pending} />
      </label>
      <label className="cr-label">
        Lane
        <select className="cr-select" name="lane" disabled={disabled || pending} defaultValue="intake">
          {LANES.map((lane) => (
            <option key={lane} value={lane}>{LANE_LABEL[lane]}</option>
          ))}
        </select>
      </label>
      <label className="cr-label">
        Neighbourhood, if this note is about coverage
        <select className="cr-select" name="neighbourhood" disabled={disabled || pending} defaultValue="">
          <option value="">None</option>
          {AREAS.map((area) => (
            <option key={area.name} value={area.name}>{area.name}</option>
          ))}
        </select>
      </label>
      {tasks.length > 0 ? (
        <label className="cr-label">
          Depends on
          <select className="cr-select" name="dependsOn" multiple disabled={disabled || pending} size={Math.min(4, tasks.length)}>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
        </label>
      ) : null}
      <button className="cr-btn cr-btn-primary" type="submit" disabled={disabled || pending}>
        {pending ? "Recording…" : "Record task"}
      </button>
      <p className="cr-reason">{reason ?? "This writes an audit row. It does not message Intake, Pipeline, Desk, or Cursor."}</p>
      <Feedback error={error} notice={notice} />
    </form>
  );
}

export function StatusForm({
  taskId,
  options,
  disabled,
  reason,
}: {
  taskId: string;
  options: { value: string; label: string }[];
  disabled: boolean;
  reason: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (options.length === 0) return <p className="cr-reason">This record is finished. Status stays as logged.</p>;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending) return;
    setPending(true);
    setError(null);
    const status = new FormData(event.currentTarget).get("status");
    const result = await postJson(`/api/control/tasks/${taskId}`, { status });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(result.notice);
    router.refresh();
  }

  return (
    <form className="cr-form" onSubmit={onSubmit}>
      <label className="cr-label">
        Record a status
        <select className="cr-select" name="status" disabled={disabled || pending} defaultValue={options[0]?.value}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <button className="cr-btn" type="submit" disabled={disabled || pending}>{pending ? "Recording…" : "Update status"}</button>
      <p className="cr-reason">{reason ?? "A status change is a log entry. It does not start an agent."}</p>
      <Feedback error={error} notice={notice} />
    </form>
  );
}

export function HandoffForm({ disabled, reason, tasks }: { disabled: boolean; reason: string | null; tasks: Task[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const open = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending) return;
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await postJson("/api/control/handoffs", {
      taskId: form.get("taskId"),
      to: form.get("to"),
      note: form.get("note"),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(result.notice);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="cr-form" onSubmit={onSubmit}>
      <label className="cr-label">
        Task
        <select className="cr-select" name="taskId" disabled={disabled || pending || open.length === 0} defaultValue={open[0]?.id ?? ""}>
          {open.map((task) => (
            <option key={task.id} value={task.id}>{task.title}</option>
          ))}
        </select>
      </label>
      <label className="cr-label">
        Record holder
        <select className="cr-select" name="to" disabled={disabled || pending} defaultValue="intake">
          {AGENTS.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
      </label>
      <label className="cr-label">
        Note
        <input className="cr-field" name="note" maxLength={280} disabled={disabled || pending} />
      </label>
      <button className="cr-btn cr-btn-primary" type="submit" disabled={disabled || pending || open.length === 0}>
        {pending ? "Recording…" : "Record handoff"}
      </button>
      <p className="cr-reason">{reason ?? "The card moves on the next load because the log changed. No desk is notified."}</p>
      <Feedback error={error} notice={notice} />
    </form>
  );
}

export function ApprovalForm({ disabled, reason, tasks }: { disabled: boolean; reason: string | null; tasks: Task[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending) return;
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await postJson("/api/control/approvals", {
      title: form.get("title"),
      detail: form.get("detail"),
      kind: form.get("kind"),
      taskId: form.get("taskId"),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(result.notice);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="cr-form" onSubmit={onSubmit}>
      <label className="cr-label">
        What needs a decision
        <input className="cr-field" name="title" maxLength={120} disabled={disabled || pending} required={!disabled} />
      </label>
      <label className="cr-label">
        Type
        <select className="cr-select" name="kind" disabled={disabled || pending} defaultValue="record-only">
          {APPROVAL_KINDS.map((kind) => (
            <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>
          ))}
        </select>
      </label>
      <label className="cr-label">
        Related task
        <select className="cr-select" name="taskId" disabled={disabled || pending} defaultValue="">
          <option value="">None</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>{task.title}</option>
          ))}
        </select>
      </label>
      <label className="cr-label">
        Detail
        <textarea className="cr-field" name="detail" maxLength={500} rows={3} disabled={disabled || pending} />
      </label>
      <button className="cr-btn cr-btn-primary" type="submit" disabled={disabled || pending}>
        {pending ? "Recording…" : "Request decision"}
      </button>
      <p className="cr-reason">{reason ?? "Consequential types stay fails closed even after you approve them."}</p>
      <Feedback error={error} notice={notice} />
    </form>
  );
}

export function DecisionButtons({ approvalId, disabled, reason }: { approvalId: string; disabled: boolean; reason: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function decide(decision: "approved" | "declined") {
    if (disabled || pending) return;
    setPending(true);
    setError(null);
    const result = await postJson(`/api/control/approvals/${approvalId}`, { decision });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(result.notice);
    router.refresh();
  }

  return (
    <div className="cr-actions">
      <button className="cr-btn" type="button" disabled={disabled || pending} onClick={() => decide("approved")}>
        Record approval
      </button>
      <button className="cr-btn" type="button" disabled={disabled || pending} onClick={() => decide("declined")}>
        Record decline
      </button>
      <p className="cr-reason">{reason ?? "Recording a decision does not send mail, approve a cleaner, merge, deploy, charge, or change DNS."}</p>
      <Feedback error={error} notice={notice} />
    </div>
  );
}
