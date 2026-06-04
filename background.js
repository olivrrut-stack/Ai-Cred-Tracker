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

});
