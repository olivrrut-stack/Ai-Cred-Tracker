function getBarColor(percent) {
  if (percent >= 85) return "#ef4444";
  if (percent >= 60) return "#f97316";
  return "#22c55e";
}

function calcProjection(data) {
  if (!data?.resetsAt || data?.percent == null) return null;
  const WINDOW_MS = 5 * 60 * 60 * 1000;
  const remaining = new Date(data.resetsAt) - Date.now();
  if (remaining <= 0 || remaining >= WINDOW_MS) return null;
  const elapsedHours = (WINDOW_MS - remaining) / 3600000;
  if (elapsedHours < 0.1) return null;
  const avgPerHour = data.percent / elapsedHours;
  if (avgPerHour <= 0) return null;
  const msToFull = ((100 - data.percent) / avgPerHour) * 3600000;
  if (msToFull >= remaining) return null;
  const h = Math.floor(msToFull / 3600000);
  const m = Math.floor((msToFull % 3600000) / 60000);
  return h > 0 ? `⚠ ~${h}h ${m}m left` : `⚠ ~${m}m left`;
}

function buildWidgetHTML(usage) {
  const data = usage.claude;
  const percent = data ? data.percent : 0;
  const color = getBarColor(percent);
  const hasData = !!data;
  const resetText = data?.resetText || null;
  const projection = hasData ? calcProjection(data) : null;

  const sd = data?.sevenDay || null;
  const sdPercent = sd ? sd.percent : 0;
  const sdColor = getBarColor(sdPercent);

  const metaRow = (resetText || projection) ? `
    <div class="act-meta">
      <span class="act-reset-text">${resetText || ""}</span>
      ${projection ? `<span class="act-projection">${projection}</span>` : ""}
    </div>` : "";

  const sdMetaRow = sd?.resetText ? `
    <div class="act-meta">
      <span class="act-reset-text">${sd.resetText}</span>
    </div>` : "";

  return `
    <div class="act-header" id="act-header">
      <span>Claude Usage</span>
      <button class="act-ghost-btn" id="act-ghost-btn" title="Minimal mode">◉</button>
    </div>
    <div class="act-body" id="act-body">
      <div class="act-row">
        <span class="act-period">5h</span>
        <div class="act-bar-track">
          <div class="act-bar-fill" style="width: ${percent}%; background: ${color};"></div>
        </div>
        <span class="act-percent" style="color: ${hasData ? color : "#6b7280"}">
          ${hasData ? percent + "%" : "—"}
        </span>
      </div>
      ${metaRow}
      <div class="act-divider"></div>
      <div class="act-row">
        <span class="act-period">7d</span>
        <div class="act-bar-track">
          <div class="act-bar-fill" style="width: ${sdPercent}%; background: ${sdColor};"></div>
        </div>
        <span class="act-percent" style="color: ${sd ? sdColor : "#6b7280"}">
          ${sd ? sdPercent + "%" : "—"}
        </span>
      </div>
      ${sdMetaRow}
    </div>
    <div class="act-dot" id="act-dot" style="background: ${color};"></div>
  `;
}

function getClaudeBg() {
  const isDark = document.documentElement.classList.contains("dark") ||
                 document.body.classList.contains("dark") ||
                 window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (isDark) {
    for (const sel of ["main", "body", "html"]) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return bg;
    }
    return "#1e1e1e";
  }
  return "#ffffff";
}

function syncBg(widget) {
  const bg = getClaudeBg();
  widget.style.background = bg;
  const isDark = bg !== "#ffffff";
  widget.style.borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  widget.classList.toggle("act-light", !isDark);
}

function makeDraggable(widget) {
  let dragging = false;
  let startX, startY, origLeft, origTop;

  widget.addEventListener("mousedown", (e) => {
    if (e.target.closest("#act-ghost-btn")) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = widget.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    widget.style.right = "auto";
    widget.style.left = origLeft + "px";
    widget.style.top = origTop + "px";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    widget.style.left = (origLeft + e.clientX - startX) + "px";
    widget.style.top = (origTop + e.clientY - startY) + "px";
  });

  document.addEventListener("mouseup", () => { dragging = false; });
}

function injectWidget() {
  if (document.getElementById("ai-credit-tracker")) return;
  console.log("[ACT] injecting widget");
  const widget = document.createElement("div");
  widget.id = "ai-credit-tracker";
  widget.innerHTML = buildWidgetHTML({});
  document.body.appendChild(widget);
  makeDraggable(widget);
  syncBg(widget);

  if (localStorage.getItem("actGhostMode") === "1") {
    widget.classList.add("act-ghost");
  }

  document.getElementById("act-ghost-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isGhost = widget.classList.toggle("act-ghost");
    localStorage.setItem("actGhostMode", isGhost ? "1" : "0");
    console.log("[ACT] ghost mode:", isGhost);
  });
}

async function updateWidget() {
  const widget = document.getElementById("ai-credit-tracker");
  if (!widget) return;
  const usage = await Storage.getAll();

  const data = usage.claude;
  const color = getBarColor(data?.percent ?? 0);
  const dot = document.getElementById("act-dot");
  if (dot) dot.style.background = color;

  const body = document.getElementById("act-body");
  const temp = document.createElement("div");
  temp.innerHTML = buildWidgetHTML(usage);
  const newBody = temp.querySelector("#act-body");
  if (body && newBody) body.replaceWith(newBody);
  syncBg(widget);
}
