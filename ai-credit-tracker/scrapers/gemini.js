// Gemini usage parser
// Parses JSON responses from gemini.google.com's own API calls

const GeminiParser = {
  platform: "gemini",

  detect() {
    return window.location.hostname === "gemini.google.com";
  },

  parse(url, data) {
    // Gemini (Google) uses different response structures
    // Common patterns in Google APIs

    // Pattern 1: quota or usage object
    if (data?.quota) {
      const { used, limit, total } = data.quota;
      const max = limit || total;
      if (max > 0) return (used / max) * 100;
    }

    // Pattern 2: usageLimits (Google API style camelCase)
    if (data?.usageLimits) {
      const { queriesPerDay, queriesPerDayUsed } = data.usageLimits;
      if (queriesPerDay > 0) return (queriesPerDayUsed / queriesPerDay) * 100;
    }

    // Pattern 3: nested account/subscription data
    const sub = data?.subscription || data?.entitlement || data?.account;
    if (sub?.usage_percent !== undefined) return sub.usage_percent;
    if (sub?.used !== undefined && sub?.limit > 0) {
      return (sub.used / sub.limit) * 100;
    }

    // Pattern 4: flat percent field
    if (data?.usage_percent !== undefined) return data.usage_percent;

    return null;
  }
};
