import { distanceMeters, etaMinutes } from "./geo";
import { SimulatedGpsStream, type GpsFix, type LatLng } from "./gps";
import { advanceJobStatus, isGpsActive, transitionJobStatus, type JobStatus } from "./status";

export type VisitSnapshot = {
  status: JobStatus;
  fix: GpsFix;
  etaMinutes: number | null;
  streaming: boolean;
};

export class VisitPlayback {
  private status: JobStatus = "enroute";
  private hold = 0;
  private last: GpsFix;
  private readonly stream: SimulatedGpsStream;
  private readonly home: LatLng;
  private readonly holdTicks: number;
  private readonly arriveRadiusM: number;

  constructor(options: { route: LatLng[]; home: LatLng; holdTicks?: number; arriveRadiusM?: number }) {
    if (options.route.length === 0) throw new Error("Visit playback needs a route");
    this.stream = new SimulatedGpsStream(options.route);
    this.home = options.home;
    this.holdTicks = options.holdTicks ?? 4;
    this.arriveRadiusM = options.arriveRadiusM ?? 40;
    this.last = { ...options.route[0], timestamp: 0 };
  }

  start() {
    if (this.status === "done") return;
    this.stream.start();
  }

  stop() {
    this.stream.stop();
  }

  /** Manual status. Illegal jumps are ignored. Done stops GPS. */
  setStatus(next: JobStatus) {
    this.status = transitionJobStatus(this.status, next);
    if (this.status === "done") this.stop();
  }

  snapshot(): VisitSnapshot {
    return this.view();
  }

  step(now: number): VisitSnapshot {
    if (this.status === "done") {
      this.stop();
      return this.view();
    }
    if (this.status === "enroute") {
      const fix = this.stream.step(now);
      if (fix) this.last = fix;
      if (distanceMeters(this.last, this.home) <= this.arriveRadiusM) {
        this.status = "arrived";
        this.hold = 0;
      }
    } else {
      this.hold += 1;
      this.last = { ...this.last, timestamp: now };
      if (this.hold >= this.holdTicks) {
        this.status = advanceJobStatus(this.status);
        this.hold = 0;
        if (this.status === "done") this.stop();
      }
    }
    return this.view();
  }

  private view(): VisitSnapshot {
    const streaming = isGpsActive(this.status) && this.stream.running;
    const eta =
      this.status === "enroute"
        ? etaMinutes(distanceMeters(this.last, this.home))
        : this.status === "done"
          ? null
          : 0;
    return { status: this.status, fix: this.last, etaMinutes: eta, streaming };
  }
}
