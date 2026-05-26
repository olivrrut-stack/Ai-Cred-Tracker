const ClaudeParser = {
  platform: "claude",
  _orgId: null,

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

  async fetchUsage() {
    const orgId = await this._getOrgId();
    if (!orgId) return null;
    try {
      const res = await fetch(`/api/organizations/${orgId}/usage`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!res.ok) return null;
      const data = await res.json();
      const session = data.five_hour;
      if (!session || typeof session.utilization !== "number") return null;
      const percent = Math.max(0, Math.min(100, session.utilization));
      return { percent, resetText: this._resetFromISO(session.resets_at), resetsAt: session.resets_at || null };
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
