// Widget — injects and updates the always-visible overlay in the top right corner

const PLATFORM_LABELS = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini"
};

function getBarColor(percent) {
  if (percent >= 85) return "#ef4444"; // red
  if (percent >= 60) return "#f97316"; // orange
  return "#22c55e";                    // green
}

function buildWidgetHTML(usage) {
  const platforms = Object.keys(PLATFORM_LABELS);

  const rows = platforms.map((key) => {
    const data = usage[key];
    const percent = data ? data.percent : 0;
    const color = getBarColor(percent);
    const label = PLATFORM_LABELS[key];
    const hasData = !!data;

    return `
      <div class="act-row">
        <span class="act-label">${label}</span>
        <div class="act-bar-track">
          <div class="act-bar-fill" style="width: ${percent}%; background: ${color};"></div>
        </div>
        <span class="act-percent" style="color: ${hasData ? color : "#6b7280"}">
          ${hasData ? percent + "%" : "--"}
        </span>
      </div>
    `;
  }).join("");

  return `
    <div class="act-header">
      <span>AI Usage</span>
      <button class="act-toggle" id="act-minimize">−</button>
    </div>
    <div class="act-body" id="act-body">
      ${rows}
    </div>
  `;
}

function injectWidget() {
  if (document.getElementById("ai-credit-tracker")) return;

  const widget = document.createElement("div");
  widget.id = "ai-credit-tracker";
  widget.innerHTML = buildWidgetHTML({});
  document.body.appendChild(widget);

  // Minimize toggle
  widget.addEventListener("click", (e) => {
    if (e.target.id === "act-minimize") {
      const body = document.getElementById("act-body");
      const btn = document.getElementById("act-minimize");
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "block" : "none";
      btn.textContent = isHidden ? "−" : "+";
    }
  });
}

async function updateWidget() {
  const widget = document.getElementById("ai-credit-tracker");
  if (!widget) return;

  const usage = await Storage.getAll();
  const body = document.getElementById("act-body");
  if (body && body.style.display !== "none") {
    // Re-render rows only, preserve minimize state
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = buildWidgetHTML(usage);
    const newBody = tempDiv.querySelector("#act-body");
    if (newBody) body.innerHTML = newBody.innerHTML;
  }
}

// Inject on load — wait for body to exist first
function tryInject() {
  if (document.body) {
    injectWidget();
    updateWidget();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      injectWidget();
      updateWidget();
    });
  }
}

tryInject();
