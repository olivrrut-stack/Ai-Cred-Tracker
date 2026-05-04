const parsers = [ClaudeParser];

// Inject into page context so fetch can be wrapped (original working approach)
const script = document.createElement("script");
script.src = chrome.runtime.getURL("injected.js");
script.onload = () => script.remove();
(document.documentElement || document.head || document.body).appendChild(script);

function getActiveParser() {
  return parsers.find((p) => p.detect()) || null;
}

function toResult(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  return { percent: raw, resetText: null };
}

// Receive intercepted network responses from injected.js
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "ACT_NETWORK_RESPONSE") return;
  const parser = getActiveParser();
  if (!parser) return;
  const result = toResult(parser.parse(event.data.url, event.data.data));
  if (result?.percent != null) {
    await Storage.set(parser.platform, result.percent, { resetText: result.resetText });
    updateWidget();
  }
});

async function pollUsage() {
  const parser = getActiveParser();
  if (!parser?.fetchUsage) return;
  const result = toResult(await parser.fetchUsage());
  if (result?.percent != null) {
    await Storage.set(parser.platform, result.percent, { resetText: result.resetText });
    updateWidget();
  }
}

// Watch for SPA navigation and re-poll when URL changes
let _lastPath = location.pathname;
new MutationObserver(() => {
  if (location.pathname !== _lastPath) {
    _lastPath = location.pathname;
    setTimeout(pollUsage, 1500);
  }
}).observe(document.documentElement, { childList: true, subtree: true });

function init() {
  injectWidget();
  updateWidget();
  pollUsage();
  setInterval(pollUsage, 60 * 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
