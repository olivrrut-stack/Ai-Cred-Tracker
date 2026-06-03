const ClaudeParser = {
  platform: "claude",
  _orgId: null,
  _cache: null,
  _cacheAt: 0,
  _CACHE_MS: 30_000,

  detect() {
    return window.location.hostname === "claude.ai";
  },

  async _getOrgId() {
    if (this._orgId) return this._orgId;
    try {
      const res = await fetch("/api/organizations", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!res.ok) return null;
      const orgs = await res.json();
      if (!Array.isArray(orgs) || orgs.length === 0) return null;
      const org = orgs.find(o => Array.isArray(o.capabilities) && o.capabilities.includes("chat")) || orgs[0];
      this._orgId = org?.uuid || org?.id || null;
    } catch (_) {}
    return this._orgId;
  },

  async _fetchWithRetry(url, opts, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url, opts);
        if (res.status === 429 || res.status === 503) {
          if (i < retries) { await new Promise(r => setTimeout(r, 1000 * (i + 1))); continue; }
          return null;
        }
        return res.ok ? res : null;
      } catch (_) {
        if (i < retries) { await new Promise(r => setTimeout(r, 1000 * (i + 1))); continue; }
        return null;
      }
    }
  },

  async fetchUsage() {
    if (this._cache && Date.now() - this._cacheAt < this._CACHE_MS) return this._cache;

    const orgId = await this._getOrgId();
    if (!orgId) return null;

    const res = await this._fetchWithRetry(`/api/organizations/${orgId}/usage`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!res) return null;

    try {
      const data = await res.json();
      const session = data.five_hour;
      if (!session || typeof session.utilization !== "number") return null;
      const percent = Math.max(0, Math.min(100, session.utilization));

      const sd = data.seven_day;
      const sevenDay = (sd && typeof sd.utilization === "number") ? {
        percent: Math.max(0, Math.min(100, sd.utilization)),
        resetText: this._resetFromISO(sd.resets_at)
      } : null;

      this._cache = { percent, resetText: this._resetFromISO(session.resets_at), resetsAt: session.resets_at || null, sevenDay };
      this._cacheAt = Date.now();
      return this._cache;
    } catch (_) { return null; }
  },

  _resetFromISO(iso) {
    if (!iso) return null;
    try {
      const diff = new Date(iso) - Date.now();
      if (diff <= 0) return null;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (days > 0) return `Resets in ${days}d ${hours}h`;
      if (hours > 0) return `Resets in ${hours}h ${mins}m`;
      return `Resets in ${mins}m`;
    } catch (_) { return null; }
  }
};
