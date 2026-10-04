import { describe, expect, it } from "vitest";
import { createGemRequestPool, type GemRequestLane } from "@/lib/sources/gem-request-pool";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}
const flush = async () => {for (let i = 0; i < 8; i++) await Promise.resolve();};
function harness() {
  const request = createGemRequestPool();
  const started: string[] = [], active = new Set<string>();
  const gates = new Map<string, ReturnType<typeof deferred<string>>>();
  let maximum = 0;
  const enqueue = (id: string, lane: GemRequestLane = "normal") => request(() => {
    started.push(id); active.add(id); maximum = Math.max(maximum, active.size);
    const gate = deferred<string>(); gates.set(id, gate);
    return gate.promise.finally(() => active.delete(id));
  }, lane);
  const complete = async () => {
    for (let round = 0; round < 30; round++) {
      for (const [id, gate] of gates) gate.resolve(id);
      await flush();
      if (!active.size) break;
    }
  };
  return {enqueue, started, active, gates, complete, maximum: () => maximum};
}

describe("shared GeM request scheduler", () => {
  it("never exceeds four active requests across mixed lanes", async () => {
    const pool = harness();
    const results = Array.from({length: 24}, (_, i) => pool.enqueue(String(i), i % 2 ? "priority" : "normal"));
    await flush();
    expect(pool.active.size).toBe(4);
    await pool.complete();
    await Promise.all(results);
    expect(pool.maximum()).toBe(4);
    expect(pool.started).toHaveLength(24);
  });

  it("starts priority work before an ordinary backlog and gives normal work a slot when both queues wait", async () => {
    const pool = harness();
    const normal = Array.from({length: 12}, (_, i) => pool.enqueue(`n${i}`));
    const priority = Array.from({length: 12}, (_, i) => pool.enqueue(`p${i}`, "priority"));
    await flush();
    pool.gates.get("n0")!.resolve("n0");
    await flush();
    expect(pool.started[4]).toBe("p0");
    for (const id of ["n1", "n2", "n3"]) {pool.gates.get(id)!.resolve(id); await flush();}
    expect([...pool.active].filter((id) => id.startsWith("p"))).toHaveLength(3);
    expect([...pool.active].filter((id) => id.startsWith("n"))).toEqual(["n4"]);
    // Normal work progresses even while more priority requests remain queued.
    pool.gates.get("n4")!.resolve("n4"); await flush();
    expect(pool.active.has("n5")).toBe(true);
    await pool.complete(); await Promise.all([...normal, ...priority]);
  });

  it.each(["normal", "priority"] as const)("lets the %s lane borrow all four idle slots", async (lane) => {
    const pool = harness();
    const results = Array.from({length: 6}, (_, i) => pool.enqueue(String(i), lane));
    await flush();
    expect(pool.started).toHaveLength(4);
    await pool.complete(); await Promise.all(results);
    expect(pool.maximum()).toBe(4);
  });

  it("releases a rejected request's slot and preserves its error", async () => {
    const pool = harness();
    const first = pool.enqueue("reject").catch((error: Error) => error.message);
    const others = Array.from({length: 4}, (_, i) => pool.enqueue(`n${i}`));
    await flush();
    pool.gates.get("reject")!.reject(Error("upstream unavailable"));
    await flush();
    expect(pool.started).toContain("n3");
    expect(await first).toBe("upstream unavailable");
    await pool.complete(); await Promise.all(others);
    expect(pool.maximum()).toBe(4);
  });

  it("releases a slot after a synchronous throw", async () => {
    const request = createGemRequestPool();
    const failure = request(() => {throw Error("sync failure");}).catch((error: Error) => error.message);
    const successes = Array.from({length: 8}, (_, i) => request(() => Promise.resolve(i), "priority"));
    expect(await failure).toBe("sync failure");
    expect(await Promise.all(successes)).toEqual([0,1,2,3,4,5,6,7]);
  });
});
