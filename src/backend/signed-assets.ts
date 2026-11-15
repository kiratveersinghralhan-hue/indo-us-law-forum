export type SignedAsset = { url: string; label: string };
type Entry = {
  value?: SignedAsset;
  expires: number;
  blockedUntil: number;
  failed: boolean;
  pending?: Promise<SignedAsset>;
  listeners: Set<() => void>;
};

// One manager per Auth environment. URLs stay in memory, never content/storage.
export class SignedAssets {
  private entries = new Map<string, Entry>();
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private generation = 0;
  constructor(private sign: (id: string) => Promise<SignedAsset>) {}
  private entry(id: string) {
    let entry = this.entries.get(id);
    if (!entry) {
      entry = {
        expires: 0,
        blockedUntil: 0,
        failed: false,
        listeners: new Set(),
      };
      this.entries.set(id, entry);
    }
    return entry;
  }
  peek(id: string) {
    return this.entries.get(id)?.value;
  }
  unavailable(id: string) {
    return this.entries.get(id)?.failed ?? false;
  }
  async get(id: string, failedURL?: string): Promise<SignedAsset> {
    if (this.disposed) throw Error('Asset environment disposed.');
    const entry = this.entry(id);
    if (entry.pending) return entry.pending;
    const now = Date.now();
    if (failedURL && entry.value && failedURL !== entry.value.url)
      return entry.value;
    if (now < entry.blockedUntil) {
      if (entry.value && !entry.failed) return entry.value;
      throw Error('Asset renewal is temporarily unavailable.');
    }
    if (!failedURL && entry.value && now < entry.expires - 60_000)
      return entry.value;
    // Rate-limit failures too, including a new signed URL whose image also fails.
    entry.blockedUntil = now + 30_000;
    const generation = this.generation;
    const pending = this.sign(id)
      .then((value) => {
        if (generation !== this.generation || this.disposed)
          throw Error('Asset session changed.');
        entry.value = value;
        entry.expires = Date.now() + 300_000;
        entry.failed = false;
        entry.listeners.forEach((listener) => listener());
        return value;
      })
      .catch(() => {
        if (generation === this.generation && !this.disposed) {
          entry.failed = true;
          entry.value = undefined; // Do not keep a revoked private preview visible.
          entry.listeners.forEach((listener) => listener());
        }
        throw Error('Asset unavailable.');
      })
      .finally(() => {
        if (entry.pending === pending) entry.pending = undefined;
        this.schedule();
      });
    entry.pending = pending;
    this.schedule();
    return pending;
  }
  observe(ids: string[], listener: () => void) {
    const unique = [...new Set(ids.filter(Boolean))];
    unique.forEach((id) => this.entry(id).listeners.add(listener));
    this.resume();
    return () => {
      unique.forEach((id) => this.entries.get(id)?.listeners.delete(listener));
      this.schedule();
    };
  }
  resume = () => {
    if (this.disposed || (typeof document !== 'undefined' && document.hidden))
      return;
    this.entries.forEach((entry, id) => {
      if (
        entry.listeners.size &&
        Date.now() >= entry.blockedUntil &&
        (entry.failed || Date.now() >= entry.expires - 60_000)
      )
        void this.get(id).catch(() => {});
    });
    this.schedule();
  };
  private schedule() {
    clearTimeout(this.timer);
    if (this.disposed || (typeof document !== 'undefined' && document.hidden))
      return;
    const due = [...this.entries.values()]
      .filter(
        (entry) => entry.listeners.size && !entry.failed && !entry.pending,
      )
      .map((entry) => Math.max(entry.expires - 60_000, entry.blockedUntil));
    if (due.length)
      this.timer = setTimeout(
        this.resume,
        Math.max(10, Math.min(...due) - Date.now()),
      );
  }
  start() {
    if (typeof window === 'undefined') return;
    window.addEventListener('focus', this.resume);
    document.addEventListener('visibilitychange', this.resume);
  }
  clear() {
    this.generation++;
    this.entries.forEach((entry) => {
      entry.value = undefined;
      entry.pending = undefined;
      entry.blockedUntil = 0;
      entry.expires = 0;
      entry.failed = true;
      entry.listeners.forEach((listener) => listener());
    });
    clearTimeout(this.timer);
  }
  dispose() {
    this.disposed = true;
    this.clear();
    this.entries.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.resume);
      document.removeEventListener('visibilitychange', this.resume);
    }
  }
}
