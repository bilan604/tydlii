import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { storeIsDurable } from "../waitlist-store";
import { emptyControlFile, parseControlFile, type ControlFile } from "./model";

export type LoadedControl =
  | { status: "ok"; file: ControlFile; durable: boolean }
  | { status: "absent"; file: ControlFile; durable: boolean }
  | { status: "unavailable"; reason: string };

export function controlRoomStorePath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.CONTROL_ROOM_STORE_PATH?.trim();
  if (configured) return configured;
  if (env.RENDER === "true") return "/var/data/control-room.json";
  return path.join(process.cwd(), "data", "control-room.json");
}

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(filePath) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  locks.set(
    filePath,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

async function durable(filePath: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  try {
    return await storeIsDurable(filePath, { RENDER: env.RENDER });
  } catch {
    return false;
  }
}

export async function loadControlFile(filePath: string, env: NodeJS.ProcessEnv = process.env): Promise<LoadedControl> {
  const isDurable = await durable(filePath, env);
  if (!isDurable) {
    return {
      status: "unavailable",
      reason: "The control-room file is not on a persistent disk. Recording is off so a deploy cannot pretend the log survived.",
    };
  }
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { status: "absent", file: emptyControlFile(), durable: true };
    }
    return { status: "unavailable", reason: "The control-room file could not be read." };
  }
  if (!text.trim()) return { status: "ok", file: emptyControlFile(), durable: true };
  try {
    const parsed = parseControlFile(JSON.parse(text) as unknown);
    if (!parsed) return { status: "unavailable", reason: "The control-room file is not a valid audit log. It was left unchanged." };
    return { status: "ok", file: parsed, durable: true };
  } catch {
    return { status: "unavailable", reason: "The control-room file is not valid JSON. It was left unchanged." };
  }
}

async function save(filePath: string, file: ControlFile): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(tmp, "w", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(file, null, 2)}\n`);
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
  await handle.close();
  try {
    await rename(tmp, filePath);
  } catch (error) {
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
}

export async function updateControlFile(
  filePath: string,
  env: NodeJS.ProcessEnv,
  change: (file: ControlFile) => { ok: true; notice: string } | { ok: false; error: string },
): Promise<{ ok: true; file: ControlFile; notice: string } | { ok: false; status: number; error: string }> {
  return withLock(filePath, async () => {
    const loaded = await loadControlFile(filePath, env);
    if (loaded.status === "unavailable") return { ok: false, status: 503, error: loaded.reason };
    const draft: ControlFile = structuredClone(loaded.file);
    const result = change(draft);
    if (!result.ok) return { ok: false, status: 400, error: result.error };
    try {
      await save(filePath, draft);
    } catch {
      return { ok: false, status: 503, error: "The control-room file could not be saved." };
    }
    return { ok: true, file: draft, notice: result.notice };
  });
}
