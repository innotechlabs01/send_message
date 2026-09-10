import { useEffect, useSyncExternalStore } from "react";

export type Category = {
  id: string;
  label: string;
  icon: string; // lucide name
  description: string;
  accent: string;
};

export const CATEGORIES: Category[] = [
  { id: "cumpleanos", label: "Cumpleaños", icon: "Cake", description: "Celebrar un año más", accent: "cumpleanos" },
  { id: "graduacion", label: "Graduación", icon: "GraduationCap", description: "Un logro académico", accent: "graduacion" },
  { id: "aniversario", label: "Aniversario", icon: "Heart", description: "Tiempo compartido", accent: "aniversario" },
  { id: "boda", label: "Boda", icon: "Gem", description: "Un nuevo comienzo", accent: "boda" },
  { id: "nacimiento", label: "Nacimiento", icon: "Baby", description: "Bienvenida al mundo", accent: "nacimiento" },
  { id: "amistad", label: "Amistad", icon: "Sparkles", description: "Cariño sincero", accent: "amistad" },
];

export const PRICE_PER_MESSAGE = 4990; // COP

export type Draft = {
  categoryId: string | null;
  message: string | null;
  recipient: string;
  sender: string;
  phoneFrom: string;
  phoneTo: string;
  sendDate: string | null;
};

export type CartItem = {
  id: string;
  categoryId: string;
  message: string;
  recipient: string;
  sender: string;
  phoneFrom: string;
  phoneTo: string;
  sendDate: string;
};

export type WizardState = {
  draft: Draft;
  items: CartItem[];
};

export type WizardSnapshot = WizardState & { hydrated: boolean };

const emptyDraft: Draft = {
  categoryId: null,
  message: null,
  recipient: "",
  sender: "",
  phoneFrom: "",
  phoneTo: "",
  sendDate: null,
};

const initial: WizardState = { draft: { ...emptyDraft }, items: [] };

let state: WizardState = { draft: { ...emptyDraft }, items: [] };
let hydrated = false;
const listeners = new Set<() => void>();
const STORAGE_KEY = "sentido-wizard-v2";
let snapshot: WizardSnapshot = { ...initial, hydrated: false };

function notify() { listeners.forEach((l) => l()); }
function syncSnapshot() { snapshot = { ...state, hydrated }; }
function persist() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
const serverSnapshot: WizardSnapshot = { ...initial, hydrated: false };
function readSnapshot(): WizardSnapshot { return snapshot; }
function readServerSnapshot(): WizardSnapshot { return serverSnapshot; }

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function commit(next: WizardState) {
  state = next;
  syncSnapshot();
  persist();
  notify();
}

export const wizard = {
  get: () => state,
  setDraft: (patch: Partial<Draft>) => {
    commit({ ...state, draft: { ...state.draft, ...patch } });
  },
  resetDraft: () => {
    commit({ ...state, draft: { ...emptyDraft } });
  },
  draftFromItem: (item: CartItem) => {
    const d: Draft = { ...item };
    commit({ ...state, draft: d });
  },
  addItemFromDraft: (): CartItem | null => {
    const d = state.draft;
    if (!d.categoryId || !d.message || !d.sendDate) return null;
    const item: CartItem = {
      id: newId(),
      categoryId: d.categoryId,
      message: d.message,
      recipient: d.recipient,
      sender: d.sender,
      phoneFrom: d.phoneFrom,
      phoneTo: d.phoneTo,
      sendDate: d.sendDate,
    };
    commit({ items: [...state.items, item], draft: { ...emptyDraft } });
    return item;
  },
  addItem: (item: Omit<CartItem, "id">) => {
    const full: CartItem = { id: newId(), ...item };
    commit({ ...state, items: [...state.items, full] });
    return full;
  },
  updateItem: (id: string, patch: Partial<Omit<CartItem, "id">>) => {
    commit({
      ...state,
      items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  },
  removeItem: (id: string) => {
    commit({ ...state, items: state.items.filter((i) => i.id !== id) });
  },
  reset: () => {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
    commit({ draft: { ...emptyDraft }, items: [] });
  },
  hydrate: () => {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        state = {
          draft: { ...emptyDraft, ...(parsed.draft ?? {}) },
          items: Array.isArray(parsed.items) ? parsed.items : [],
        };
      } catch {
        state = { draft: { ...emptyDraft }, items: [] };
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    syncSnapshot();
    notify();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useWizard() {
  const s = useSyncExternalStore(wizard.subscribe, readSnapshot, readServerSnapshot);
  useEffect(() => { wizard.hydrate(); }, []);
  return s;
}

export function getCategory(id: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}
