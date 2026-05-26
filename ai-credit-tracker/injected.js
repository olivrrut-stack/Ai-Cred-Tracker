// injected.js — runs inside the page's own context (not the extension sandbox)
// Wraps window.fetch to intercept all JSON responses the page makes to its own servers

(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const clone = response.clone();

    try {
      const json = await clone.json();
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      // Debug: log every intercepted response so we can find usage endpoints
      const usageKeywords = ["usage", "limit", "messages", "quota", "remaining", "cap", "plan"];
      const dataStr = JSON.stringify(json).toLowerCase();
      const isUsageRelated = usageKeywords.some((k) => dataStr.includes(k));

      if (isUsageRelated) {
        console.log("[ACT Debug] Usage-related response found:");
        console.log("  URL:", url);
        console.log("  Data:", json);
      }

      window.postMessage(
        {
          type: "ACT_NETWORK_RESPONSE",
          url: url,
          data: json
        },
        "*"
      );
    } catch (e) {
      // Not JSON — ignore
    }

    return response;
  };

  // Also wrap XMLHttpRequest for older request patterns
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._actUrl = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        const json = JSON.parse(this.responseText);
        window.postMessage(
          {
            type: "ACT_NETWORK_RESPONSE",
            url: this._actUrl || "",
            data: json
          },
          "*"
        );
      } catch (e) {
        // Not JSON — ignore
      }
    });
    return originalSend.apply(this, args);
  };
})();
