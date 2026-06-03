chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ aiUsage: {} });
  console.log("[ACT] installed/updated");
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "usageUpdate") return;
  const percent = msg.percent;
  if (typeof percent !== "number") return;

  console.log("[ACT] badge update:", percent);

  const color = percent >= 85 ? "#ef4444" : percent >= 60 ? "#f97316" : "#22c55e";
  chrome.action.setBadgeText({ text: percent + "%" });
  chrome.action.setBadgeBackgroundColor({ color });

  chrome.storage.local.get(["actNotifState"], (r) => {
    const threshold = 80;
    const lastAt = r.actNotifState?.lastAt ?? 0;
    if (percent >= threshold && Date.now() - lastAt > 4 * 60 * 60 * 1000) {
      try {
        chrome.notifications.create("act-alert", {
          type: "basic",
          iconUrl: chrome.runtime.getURL("icons/icon128.png"),
          title: "Claude Usage Alert",
          message: `You've used ${percent}% — ${100 - percent}% remaining.`
        });
        chrome.storage.local.set({ actNotifState: { lastAt: Date.now() } });
        console.log("[ACT] notification fired at", percent + "%");
      } catch (e) {
        console.error("[ACT] notification error:", e);
      }
    }
  });
});
