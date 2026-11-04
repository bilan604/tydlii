export type LatLng = { latitude: number; longitude: number };

export type GpsFix = LatLng & { timestamp: number };

export type GpsPermission = "unknown" | "granted" | "denied";

/**
 * A position source for an active job.
 * `simulated` drives the Expo web preview. `device` is the when-in-use watcher
 * a store build plugs in through `DeviceLocationAdapter` (expo-location).
 * Call `stop()` at Done. Further steps must not emit.
 */
export interface GpsStream {
  readonly kind: "simulated" | "device";
  start(): void | Promise<void>;
  stop(): void;
  step(now: number): GpsFix | null;
}

export class SimulatedGpsStream implements GpsStream {
  readonly kind = "simulated" as const;
  private index = 0;
  running = false;

  constructor(private readonly fixes: LatLng[]) {
    if (fixes.length === 0) throw new Error("Simulated GPS needs at least one point");
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  step(now: number): GpsFix | null {
    if (!this.running) return null;
    const point = this.fixes[this.index];
    if (this.index < this.fixes.length - 1) this.index += 1;
    return { ...point, timestamp: now };
  }
}

export type DeviceLocationAdapter = {
  requestWhenInUse(): Promise<GpsPermission>;
  watch(onFix: (fix: GpsFix) => void): Promise<{ remove(): void }>;
};

/** When-in-use device GPS. Does not watch after a denial, and `stop()` detaches the watcher. */
export class DeviceGpsStream implements GpsStream {
  readonly kind = "device" as const;
  permission: GpsPermission = "unknown";
  running = false;
  private latest: GpsFix | null = null;
  private sub: { remove(): void } | null = null;

  constructor(private readonly adapter: DeviceLocationAdapter) {}

  async start() {
    if (this.running) return;
    this.running = true;
    const permission = await this.adapter.requestWhenInUse();
    if (!this.running) return;
    this.permission = permission === "granted" ? "granted" : "denied";
    if (this.permission !== "granted") return;
    this.sub = await this.adapter.watch((fix) => {
      if (!this.running) return;
      this.latest = fix;
    });
    if (!this.running) {
      this.sub.remove();
      this.sub = null;
    }
  }

  stop() {
    this.running = false;
    this.sub?.remove();
    this.sub = null;
  }

  step(): GpsFix | null {
    if (!this.running) return null;
    return this.latest;
  }
}
