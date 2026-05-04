function getBarColor(percent) {
  if (percent >= 85) return "#ef4444";
  if (percent >= 60) return "#f97316";
  return "#22c55e";
}

function buildWidgetHTML(usage) {
  const data = usage.claude;
  const percent = data ? data.percent : 0;
  const color = getBarColor(percent);
  const hasData = !!data;
  const resetText = data?.resetText || null;

  return `
    <div class="act-header" id="act-header">
      <span>Claude Usage</span>
    </div>
    <div class="act-body" id="act-body">
      <div class="act-row">
        <span class="act-label">Claude</span>
        <div class="act-bar-track">
          <div class="act-bar-fill" style="width: ${percent}%; background: ${color};"></div>
        </div>
        <span class="act-percent" style="color: ${hasData ? color : "#6b7280"}">
          ${hasData ? percent + "%" : "—"}
        </span>
      </div>
      ${resetText ? `<div class="act-reset">${resetText}</div>` : ""}
    </div>
  `;
}

function makeDraggable(widget) {
  let dragging = false;
  let startX, startY, origLeft, origTop;

  widget.addEventListener("mousedown", (e) => {
    if (e.target.closest(".act-body")) return;
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
  if (body && newBody) body.innerHTML = newBody.innerHTML;
}
