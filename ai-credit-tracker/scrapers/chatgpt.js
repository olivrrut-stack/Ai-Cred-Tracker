// ChatGPT usage parser
// Parses JSON responses from chat.openai.com / chatgpt.com's own API calls

const ChatGPTParser = {
  platform: "chatgpt",

  detect() {
    const host = window.location.hostname;
    return host === "chat.openai.com" || host === "chatgpt.com";
  },

  parse(url, data) {
    // ChatGPT's known endpoint: /backend-api/accounts/check/v4-2023-04-27
    // Returns account info including message caps

    // Pattern 1: message_cap_warning or usage in accounts/check response
    if (data?.message_cap_warning) {
      const { messages_remaining, message_cap } = data.message_cap_warning;
      if (message_cap > 0) {
        const used = message_cap - messages_remaining;
        return (used / message_cap) * 100;
      }
    }

    // Pattern 2: rate limits object
    if (data?.rate_limits) {
      const limits = Array.isArray(data.rate_limits) ? data.rate_limits[0] : data.rate_limits;
      if (limits?.limit > 0 && limits?.remaining !== undefined) {
        const used = limits.limit - limits.remaining;
        return (used / limits.limit) * 100;
      }
    }

    // Pattern 3: flat usage fields
    if (data?.messages_used !== undefined && data?.messages_limit > 0) {
      return (data.messages_used / data.messages_limit) * 100;
    }

    // Pattern 4: usage_percent directly
    if (data?.usage_percent !== undefined) return data.usage_percent;

    return null;
  }
};
