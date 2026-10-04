export type GemRequestLane = "normal" | "priority";
type Job = { run: () => void };

/** Four public requests at most; when both lanes wait, target three priority
 * requests and one normal request. Idle lanes lend their slots to the other. */
export function createGemRequestPool() {
  const queues: Record<GemRequestLane, Job[]> = { normal: [], priority: [] };
  const active: Record<GemRequestLane, number> = { normal: 0, priority: 0 };
  const drain = () => {
    while (active.normal + active.priority < 4) {
      let lane: GemRequestLane;
      if (queues.priority.length && queues.normal.length) {
        lane = active.normal === 0 ? "normal"
          : active.priority < 3 ? "priority" : "normal";
      } else if (queues.priority.length) lane = "priority";
      else if (queues.normal.length) lane = "normal";
      else break;
      const job = queues[lane].shift()!;
      active[lane]++;
      job.run();
    }
  };
  return function request<T>(work: () => Promise<T>, lane: GemRequestLane = "normal"): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queues[lane].push({ run: () => {
        // A synchronous throw and an asynchronous rejection release the slot
        // before publishing the outcome to the caller.
        Promise.resolve().then(work).then((value) => {
          active[lane]--; drain(); resolve(value);
        }, (error) => {
          active[lane]--; drain(); reject(error);
        });
      }});
      drain();
    });
  };
}

/** Shared across all regional and priority adapters importing this module. */
export const gemRequest = createGemRequestPool();
