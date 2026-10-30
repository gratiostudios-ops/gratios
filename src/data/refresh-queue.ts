/** Coalesce overlapping reloads, but always reload again after an in-flight invalidation. */
export function createRefreshQueue(load: () => Promise<boolean | void>) {
  let active: Promise<void> | null = null;
  let queued = false;
  return () => {
    if (active) { queued = true; return active; }
    active = (async () => {
      do {
        queued = false;
        const stale = await load();
        if (stale) queued = true;
      } while (queued);
    })().finally(() => { active = null; });
    return active;
  };
}
