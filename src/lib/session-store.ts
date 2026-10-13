// Client-side persistence of the opaque session token so a learner can
// refresh or resume without creating a duplicate session.

const KEY = "oceanx_learning_session";

export interface StoredSession {
  sessionId: string;
  token: string;
  pending?: boolean;
  participantCode?: string | undefined;
  isDemo?: boolean;
}

export function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (typeof parsed.sessionId === "string" && typeof parsed.token === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredSession(s: StoredSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

// getRandomValues also works on private Wi-Fi HTTP, where randomUUID may be absent.
// This is still cryptographically random; never fall back to Math.random for tokens.
export function newSessionRef(): StoredSession {
  const uuid = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
  return { sessionId: uuid(), token: uuid() };
}
