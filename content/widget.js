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

  const metaRow = (resetText || projection) ? `
    <div class="act-meta">
      <span class="act-reset-text">${resetText || ""}</span>
      ${projection ? `<span class="act-projection">${projection}</span>` : ""}
    </div>` : "";

  const doomed = hasData && percent >= 99;

  return `
    <div class="act-body" id="act-body">
      <div class="act-row">
        <div class="act-bar-track">
          <div class="act-bar-fill" style="width: ${percent}%; background: ${color};"></div>
        </div>
        <span class="act-percent" style="color: ${hasData ? color : "#6b7280"}">
          ${hasData ? percent + "%" : "—"}
        </span>
      </div>
      ${metaRow}
      ${doomed ? `<div class="act-overlay">YOU'RE FUCKED</div>` : ""}
    </div>
  `;
}

function makeDraggable(widget) {
  let dragging = false;
  let startX, startY, origLeft, origTop;

  widget.addEventListener("mousedown", (e) => {
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
  const widget = document.createElement("div");
  widget.id = "ai-credit-tracker";
  widget.innerHTML = buildWidgetHTML({});
  document.body.appendChild(widget);
  makeDraggable(widget);
}

async function updateWidget() {
  const widget = document.getElementById("ai-credit-tracker");
  if (!widget) return;
  const usage = await Storage.getAll();
  const body = document.getElementById("act-body");
  const temp = document.createElement("div");
  temp.innerHTML = buildWidgetHTML(usage);
  const newBody = temp.querySelector("#act-body");
  if (body && newBody) body.replaceWith(newBody);
}
