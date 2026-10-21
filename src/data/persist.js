// Persistencia local (localStorage). Nada aqui pode derrubar o app: quota cheia, modo privado,
// storage bloqueado ou dado corrompido viram "nao salvou" / "comecar do zero".
export const STORAGE_KEY = 'faro-v2-state';
const MAX_RAW = 5e6;

const defaultStorage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function createPersister({ key = STORAGE_KEY, storage = defaultStorage(), delay = 400, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let timer = null;
  let pending = null;

  const save = blob => {
    try {
      if (!storage) return false;
      storage.setItem(key, JSON.stringify(blob));
      return true;
    } catch {
      return false;
    }
  };

  return {
    // { state, rev, dirty } ou null
    load() {
      try {
        const raw = storage && storage.getItem(key);
        if (typeof raw !== 'string' || raw.length > MAX_RAW) return null;
        const b = JSON.parse(raw);
        return b !== null && typeof b === 'object' && !Array.isArray(b) ? b : null;
      } catch {
        return null;
      }
    },
    save,
    hasPending: () => pending !== null, // ha gravacao nossa ainda nao feita: o disco esta mais velho que a memoria
    // Agenda a gravacao (debounce); o resultado de cada gravacao vai para onResult.
    schedule(getBlob, onResult) {
      pending = { getBlob, onResult };
      if (timer !== null) clearTimer(timer);
      timer = setTimer(() => this.flush(), delay);
    },
    flush() {
      if (timer !== null) { clearTimer(timer); timer = null; }
      if (!pending) return true;
      const { getBlob, onResult } = pending;
      pending = null;
      const ok = save(getBlob());
      if (onResult) onResult(ok);
      return ok;
    },
  };
}
