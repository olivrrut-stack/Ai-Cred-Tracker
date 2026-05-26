// Claude usage scraper
// Fetches claude.ai/settings/usage and parses the usage percentage from the DOM

const ClaudeParser = {
  platform: "claude",

  detect() {
    return window.location.hostname === "claude.ai";
  },

  // Called by content.js on load and on a timer
  async fetchUsage() {
    try {
      const res = await fetch("https://claude.ai/settings/usage", {
        credentials: "include"
      });
      console.log("[ACT Claude] settings/usage fetch status:", res.status);
      if (!res.ok) return null;

      const html = await res.text();
      console.log("[ACT Claude] HTML snippet:", html.slice(0, 500));

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const text = doc.body.innerText || doc.body.textContent || "";
      console.log("[ACT Claude] Parsed text snippet:", text.slice(0, 300));

      // Pattern 1: "X%" standalone percentage
      const percentMatch = text.match(/(\d+)\s*%\s*(used|of|messages)/i);
      if (percentMatch) return parseFloat(percentMatch[1]);

      // Pattern 2: "X of Y messages"
      const countMatch = text.match(/(\d+)\s+of\s+(\d+)\s+messages/i);
      if (countMatch) {
        const used = parseFloat(countMatch[1]);
        const limit = parseFloat(countMatch[2]);
        if (limit > 0) return (used / limit) * 100;
      }

      // Pattern 3: look for a progress bar with style="width: X%"
      const bars = doc.querySelectorAll("[style*='width']");
      for (const bar of bars) {
        const match = bar.style.width.match(/^(\d+(\.\d+)?)%$/);
        if (match) {
          const pct = parseFloat(match[1]);
          if (pct > 0 && pct <= 100) return pct;
        }
      }

      console.log("[ACT Claude] No usage pattern matched in page");
      return null;
    } catch (e) {
      console.log("[ACT Claude] fetchUsage error:", e.message);
      return null;
    }
  },

  // Parse intercepted network responses
  parse(url, data) {
    if (!url.includes("claude.ai") && !url.startsWith("/")) return null;

    // Primary: /api/organizations/{id}/usage — five_hour.utilization is the % used
    if (url.includes("/usage") && data?.five_hour?.utilization !== undefined) {
      return data.five_hour.utilization;
    }

    // Fallback patterns
    if (data?.usage) {
      const { used, limit, messages_used, messages_limit } = data.usage;
      if (limit > 0) return (used / limit) * 100;
      if (messages_limit > 0) return (messages_used / messages_limit) * 100;
    }

    if (data?.messages_used !== undefined && data?.messages_limit > 0) {
      return (data.messages_used / data.messages_limit) * 100;
    }

    const account = data?.account || data?.subscription || data?.plan;
    if (account?.usage_percent !== undefined) return account.usage_percent;
    if (account?.used !== undefined && account?.limit > 0) {
      return (account.used / account.limit) * 100;
    }

    return null;
  }
};
