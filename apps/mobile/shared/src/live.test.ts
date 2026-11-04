import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { densify, distanceMeters, etaMinutes, layoutVisit } from "./geo";
import { DeviceGpsStream, SimulatedGpsStream } from "./gps";
import { VisitPlayback } from "./playback";
import { LIBERTY_HOME, LIBERTY_ROUTE } from "./sample-job";
import { isGpsActive, transitionJobStatus } from "./status";

describe("job status", () => {
  it("advances one step and refuses skips", () => {
    assert.equal(transitionJobStatus("enroute", "arrived"), "arrived");
    assert.equal(transitionJobStatus("enroute", "cleaning"), "enroute");
    assert.equal(transitionJobStatus("enroute", "done"), "enroute");
    assert.equal(transitionJobStatus("done", "enroute"), "done");
  });

  it("stops GPS at Done", () => {
    assert.equal(isGpsActive("enroute"), true);
    assert.equal(isGpsActive("arrived"), true);
    assert.equal(isGpsActive("cleaning"), true);
    assert.equal(isGpsActive("done"), false);
  });
});

describe("geo", () => {
  it("measures about a kilometre per hundredth of a degree", () => {
    const meters = distanceMeters(
      { latitude: 43.65, longitude: -79.4 },
      { latitude: 43.66, longitude: -79.4 },
    );
    assert.ok(meters > 1000 && meters < 1200);
  });

  it("counts ETA down to zero at the door", () => {
    assert.equal(etaMinutes(40), 0);
    assert.equal(etaMinutes(240, 2), 2);
  });

  it("places the cleaner west of the home on the sample route", () => {
    const layout = layoutVisit({
      home: LIBERTY_HOME,
      cleaner: LIBERTY_ROUTE[0],
      route: LIBERTY_ROUTE,
    });
    assert.ok(layout.cleaner);
    assert.ok(layout.cleaner.left < layout.home.left);
    assert.equal(densify(LIBERTY_ROUTE, 8).length, 8);
  });
});

describe("simulated GPS", () => {
  it("does not emit after stop", () => {
    const stream = new SimulatedGpsStream(LIBERTY_ROUTE);
    stream.start();
    assert.ok(stream.step(1));
    stream.stop();
    assert.equal(stream.step(2), null);
  });
});

describe("device GPS", () => {
  it("does not watch when location is denied", async () => {
    let watched = false;
    const stream = new DeviceGpsStream({
      async requestWhenInUse() {
        return "denied";
      },
      async watch() {
        watched = true;
        return { remove() {} };
      },
    });
    await stream.start();
    assert.equal(stream.permission, "denied");
    assert.equal(watched, false);
    assert.equal(stream.step(1), null);
  });

  it("detaches the watcher on stop", async () => {
    let removed = false;
    const stream = new DeviceGpsStream({
      async requestWhenInUse() {
        return "granted";
      },
      async watch(onFix) {
        onFix({ latitude: 43.64, longitude: -79.41, timestamp: 5 });
        return {
          remove() {
            removed = true;
          },
        };
      },
    });
    await stream.start();
    assert.equal(stream.step(1)?.latitude, 43.64);
    stream.stop();
    assert.equal(removed, true);
    assert.equal(stream.step(2), null);
  });
});

describe("visit playback", () => {
  it("moves to the home, then Cleaning, then Done, and stops streaming", () => {
    const home = { latitude: 43.64172, longitude: -79.40735 };
    const route = [
      { latitude: 43.64172, longitude: -79.419 },
      { latitude: 43.64172, longitude: -79.414 },
      { latitude: 43.64172, longitude: -79.41 },
      home,
    ];
    const playback = new VisitPlayback({ route, home, holdTicks: 1, arriveRadiusM: 40 });
    playback.start();

    let snapshot = playback.step(1);
    assert.equal(snapshot.status, "enroute");
    assert.equal(snapshot.streaming, true);
    const startLng = snapshot.fix.longitude;

    while (snapshot.status === "enroute") snapshot = playback.step(snapshot.fix.timestamp + 1);
    assert.equal(snapshot.status, "arrived");
    assert.ok(snapshot.fix.longitude > startLng);

    snapshot = playback.step(10);
    assert.equal(snapshot.status, "cleaning");
    snapshot = playback.step(11);
    assert.equal(snapshot.status, "done");
    assert.equal(snapshot.streaming, false);
    assert.equal(snapshot.etaMinutes, null);

    const after = playback.step(12);
    assert.equal(after.status, "done");
    assert.equal(after.streaming, false);
    assert.equal(after.fix.timestamp, snapshot.fix.timestamp);
  });

  it("lets a manual Done stop the stream early", () => {
    const playback = new VisitPlayback({ route: LIBERTY_ROUTE, home: LIBERTY_HOME, holdTicks: 5 });
    playback.start();
    playback.step(1);
    playback.setStatus("done");
    const snapshot = playback.step(2);
    assert.equal(snapshot.status, "enroute");
    playback.setStatus("arrived");
    playback.setStatus("cleaning");
    playback.setStatus("done");
    const done = playback.snapshot();
    assert.equal(done.status, "done");
    assert.equal(done.streaming, false);
    assert.equal(playback.step(3).streaming, false);
  });
});
