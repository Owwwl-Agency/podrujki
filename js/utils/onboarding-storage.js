/** Welcome onboarding answers, kept in localStorage so the rest of the app can personalise later */

const STORAGE_KEY = "podrujki:onboarding";

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function write(patch) {
  const next = { ...read(), ...patch, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full or disabled — onboarding still works for this visit */
  }
  return next;
}

/**
 * A missing key means the user never confirmed that step.
 * @returns {{
 *   interests?: string[],
 *   locations?: Partial<Record<"home" | "work" | "other", { lat: number, lng: number, address: string }>>,
 *   completed?: boolean,
 *   updatedAt?: string,
 * }}
 */
export function getOnboarding() {
  return read();
}

export function saveInterests(ids) {
  return write({ interests: [...ids] });
}

export function saveLocations(locations) {
  return write({ locations: { ...locations } });
}

export function completeOnboarding() {
  return write({ completed: true });
}
