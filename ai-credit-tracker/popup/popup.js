const PLATFORM_LABELS = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini"
};

function getBarColor(percent) {
  if (percent >= 85) return "#ef4444";
  if (percent >= 60) return "#f97316";
  return "#22c55e";
}

async function render() {
  const usage = await Storage.getAll();
  const list = document.getElementById("platform-list");

  list.innerHTML = Object.keys(PLATFORM_LABELS).map((key) => {
    const data = usage[key];
    const percent = data ? data.percent : 0;
    const color = getBarColor(percent);
    const hasData = !!data;
    const updatedAt = data ? new Date(data.updatedAt).toLocaleTimeString() : null;

    return `
      <div class="platform-row">
        <div class="platform-top">
          <span class="platform-name">${PLATFORM_LABELS[key]}</span>
          <span class="platform-percent" style="color: ${hasData ? color : "#6b7280"}">
            ${hasData ? percent + "%" : "No data yet"}
          </span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${percent}%; background: ${color};"></div>
        </div>
        ${updatedAt ? `<div class="updated-at">Last updated: ${updatedAt}</div>` : ""}
      </div>
    `;
  }).join("");
}

document.getElementById("clear-btn").addEventListener("click", async () => {
  await chrome.storage.local.set({ aiUsage: {} });
  render();
});

render();
