// Content script — injects the fetch interceptor and handles intercepted responses

const parsers = [ClaudeParser, ChatGPTParser, GeminiParser];

// Step 1: inject injected.js into the page's own context
// Content scripts run in a sandbox — we need to break out to wrap window.fetch
const script = document.createElement("script");
script.src = chrome.runtime.getURL("injected.js");
script.onload = () => script.remove();
(document.documentElement || document.head || document.body).appendChild(script);

// Step 2: get the active parser for this site
function getActiveParser() {
  return parsers.find((p) => p.detect()) || null;
}

// Step 3: listen for intercepted network responses posted by injected.js
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "ACT_NETWORK_RESPONSE") return;

  const { url, data } = event.data;
  const parser = getActiveParser();
  if (!parser) return;

  const percent = parser.parse(url, data);
  if (percent !== null && percent !== undefined) {
    await Storage.set(parser.platform, percent);
    updateWidget();
  }
});

// Step 4: poll fetchUsage() if the parser supports it (e.g. Claude DOM scraper)
async function pollUsage() {
  const parser = getActiveParser();
  if (!parser?.fetchUsage) return;

  const percent = await parser.fetchUsage();
  if (percent !== null && percent !== undefined) {
    await Storage.set(parser.platform, percent);
    updateWidget();
  }
}

// Run once on load, then every 2 minutes
pollUsage();
setInterval(pollUsage, 2 * 60 * 1000);

// Step 5: init widget on load
injectWidget();
updateWidget();
