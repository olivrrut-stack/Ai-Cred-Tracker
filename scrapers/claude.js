const ClaudeParser = {
  platform: "claude",

  detect() {
    return window.location.hostname === "claude.ai";
  },

  async fetchUsage() {
    // Fetch the settings page — Claude SSRs some data into it
    try {
      const res = await fetch("https://claude.ai/settings/usage", { credentials: "include" });
      if (!res.ok) return null;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const text = doc.body.innerText || doc.body.textContent || "";

      const countMatch = text.match(/(\d+)\s+of\s+(\d+)\s+messages/i);
      if (countMatch) {
        const used = parseFloat(countMatch[1]);
        const limit = parseFloat(countMatch[2]);
        if (limit > 0) return { percent: (used / limit) * 100, resetText: ClaudeParser._resetFromText(text) };
      }

      const pctMatch = text.match(/(\d+)\s*%\s*(used|of|messages)/i);
      if (pctMatch) return { percent: parseFloat(pctMatch[1]), resetText: ClaudeParser._resetFromText(text) };

      for (const el of doc.querySelectorAll("[style*='width']")) {
        const m = el.style.width.match(/^(\d+(\.\d+)?)%$/);
        if (m) {
          const pct = parseFloat(m[1]);
          if (pct > 0 && pct <= 100) return { percent: pct, resetText: ClaudeParser._resetFromText(text) };
        }
      }
    } catch (_) {}

    // Also read live DOM (works when user is already on the settings page)
    return ClaudeParser._readDOM();
  },

  // Called for every intercepted JSON response from injected.js
  parse(url, data) {
    if (!url.includes("claude.ai") && !url.startsWith("/")) return null;

    // Primary — /api/organizations/{id}/usage returns five_hour.utilization
    if (url.includes("/usage") && data?.five_hour?.utilization !== undefined) {
      const u = parseFloat(data.five_hour.utilization);
      const pct = u <= 1 ? u * 100 : u; // handle both 0–1 fraction and 0–100
      const resetText = ClaudeParser._resetFromISO(data.five_hour?.reset_at ?? data.reset_at);
      return { percent: pct, resetText };
    }

    // usage object
    if (data?.usage) {
      const { used, limit, messages_used, messages_limit, reset_at } = data.usage;
      let pct = null;
      if (limit > 0) pct = (used / limit) * 100;
      else if (messages_limit > 0) pct = (messages_used / messages_limit) * 100;
      if (pct !== null) return { percent: pct, resetText: ClaudeParser._resetFromISO(reset_at) };
    }

    if (data?.messages_used !== undefined && data?.messages_limit > 0)
      return { percent: (data.messages_used / data.messages_limit) * 100, resetText: ClaudeParser._resetFromISO(data.reset_at) };

    const account = data?.account ?? data?.subscription ?? data?.plan;
    if (account?.usage_percent !== undefined) return { percent: account.usage_percent, resetText: ClaudeParser._resetFromISO(account.reset_at) };
    if (account?.used !== undefined && account?.limit > 0)
      return { percent: (account.used / account.limit) * 100, resetText: ClaudeParser._resetFromISO(account.reset_at) };

    return null;
  },

  _readDOM() {
    const body = document.body;
    if (!body) return null;

    for (const el of document.querySelectorAll('[role="progressbar"]')) {
      const now = parseFloat(el.getAttribute("aria-valuenow"));
      const max = parseFloat(el.getAttribute("aria-valuemax") ?? "100");
      if (!isNaN(now) && max > 0) {
        const pct = (now / max) * 100;
        if (pct >= 0 && pct <= 100) return { percent: pct, resetText: ClaudeParser._resetFromText(body.innerText) };
      }
    }

    const text = body.innerText ?? "";
    const countMatch = text.match(/(\d+)\s+of\s+(\d+)\s+messages/i);
    if (countMatch)
      return { percent: (parseFloat(countMatch[1]) / parseFloat(countMatch[2])) * 100, resetText: ClaudeParser._resetFromText(text) };

    return null;
  },

  _resetFromText(text) {
    if (!text) return null;
    const on = text.match(/reset[s]?\s+on\s+([A-Za-z]+\.?\s+\d+(?:,?\s*\d{4})?)/i);
    if (on) return `Resets on ${on[1].trim()}`;
    const inn = text.match(/reset[s]?\s+in\s+(\d+\s+days?(?:\s*\d+\s+hours?)?)/i);
    if (inn) return `Resets in ${inn[1].trim()}`;
    return null;
  },

  _resetFromISO(iso) {
    if (!iso) return null;
    try {
      const diff = new Date(iso) - Date.now();
      if (diff <= 0) return null;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      if (days > 0) return `Resets in ${days}d ${hours}h`;
      if (hours > 0) return `Resets in ${hours}h`;
      return "Resets soon";
    } catch (_) { return null; }
  }
};
