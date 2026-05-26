const parsers = [ClaudeParser];

function getActiveParser() {
  return parsers.find(p => p.detect()) || null;
}

async function pollUsage() {
  const parser = getActiveParser();
  if (!parser?.fetchUsage) return;
  const result = await parser.fetchUsage();
  if (result?.percent != null) {
    await Storage.set(parser.platform, result.percent, { resetText: result.resetText, resetsAt: result.resetsAt });
    updateWidget();
  }
}

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
