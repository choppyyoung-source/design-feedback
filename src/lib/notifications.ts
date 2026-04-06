const KEY = "dr_last_seen";

interface LastSeen {
  [projectId: string]: {
    count: number; // annotation count when last seen
    seenAt: string;
  };
}

function getLastSeen(): LastSeen {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Mark a project as seen with current annotation count.
 */
export function markProjectSeen(projectId: string, totalAnnotations: number) {
  const data = getLastSeen();
  data[projectId] = {
    count: totalAnnotations,
    seenAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(data));
}

/**
 * Get number of unseen annotations for a project.
 */
export function getUnseenCount(
  projectId: string,
  currentTotal: number
): number {
  const data = getLastSeen();
  const last = data[projectId];
  if (!last) return currentTotal; // never seen = all are new
  return Math.max(0, currentTotal - last.count);
}
