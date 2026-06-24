const CHANNELS = ["Azeler", "Recambio Verde", "Recambio Facil", "Ovoko", "Ebay", "Wallapop", "Ecooparts", "Clientes llamada"];
const STORAGE = {
  map: "rc-inv-map",
  inventory: "rc-inv-inventory",
  history: "rc-inv-history",
  goals: "rc-inv-goals",
  rules: "rc-inv-rules",
  theme: "rc-inv-theme",
  catName: "rc-inv-cat-name"
};
const DEFAULT_RULES = [
  { channel: "Azeler", field: "order", pattern: "ZLR", mode: "contains" },
  { channel: "Recambio Verde", field: "order", pattern: "RV4", mode: "contains" },
  { channel: "Recambio Facil", field: "order", pattern: "RF|RFS", mode: "regex" },
  { channel: "Ovoko", field: "order", pattern: "RRR", mode: "contains" },
  { channel: "Ebay", field: "notes", pattern: "ebay|\\b\\d{2}-\\d{5}-\\d{5}\\b", mode: "regex" },
  { channel: "Wallapop", field: "notes", pattern: "wallapop", mode: "contains" },
  { channel: "Ecooparts", field: "notes", pattern: "\\bEP\\b|Ecooparts", mode: "regex" },
  { channel: "Clientes llamada", field: "order", pattern: "^P-", mode: "regex" }
];
const state = {
  rows: [],
  processed: [],
  filtered: [],
  headers: [],
  map: {},
  rules: loadJson(STORAGE.rules, DEFAULT_RULES),
  sort: { key: "date", dir: 1 }
};
const $ = (id) => document.getElementById(id);
const fmtInt = new Intl.NumberFormat("es-ES");
const fmtMoney = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
let charts = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  if (localStorage.getItem(STORAGE.theme) === "dark") document.body.classList.add("dark");
  $("inventoryDateInput").valueAsDate = new Date();
  bindEvents();
  restoreInventory();
  restoreGoals();
  restoreCatName();
  renderRules();
  renderAll();
}

function bindEvents() {
  $("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(STORAGE.theme, document.body.classList.contains("dark") ? "dark" : "light");
    renderCharts();
  });
  $("demoBtn").addEventListener("click", loadDemo);
  $("fileInput").addEventListener("change", (e) => readFile(e.target.files[0]));
  ["dragenter", "dragover"].forEach((eventName) => $("dropzone").addEventListener(eventName, onDrag));
  ["dragleave", "drop"].forEach((eventName) => $("dropzone").addEventListener(eventName, offDrag));
  $("dropzone").addEventListener("drop", (e) => readFile(e.dataTransfer.files[0]));
  $("saveMapBtn").addEventListener("click", () => {
    updateMapFromControls();
    localStorage.setItem(STORAGE.map, JSON.stringify(state.map));
    processRows();
  });
  ["dateFrom", "dateTo", "channelFilter", "textFilter", "detailSearch"].forEach((id) => $(id).addEventListener("input", applyFilters));
  $("resetFiltersBtn").addEventListener("click", resetFilters);
  $("saveInventoryBtn").addEventListener("click", saveInventory);
  $("clearHistoryBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE.history);
    renderInventory();
  });
  $("saveGoalsBtn").addEventListener("click", saveGoals);
  $("addRuleBtn").addEventListener("click", () => {
    state.rules.push({ channel: "Clientes llamada", field: "order", pattern: "", mode: "contains" });
    saveRules();
    renderRules();
  });
  $("catNameInput").addEventListener("input", () => {
    localStorage.setItem(STORAGE.catName, $("catNameInput").value.trim() || "ReciclaCAT");
    renderCatName();
  });
  $("exportXlsxBtn").addEventListener("click", exportXlsx);
  $("exportPdfBtn").addEventListener("click", exportPdf);
}

function restoreCatName() {
  $("catNameInput").value = localStorage.getItem(STORAGE.catName) || "ReciclaCAT";
  renderCatName();
}

function getCatName() {
  return ($("catNameInput")?.value || localStorage.getItem(STORAGE.catName) || "ReciclaCAT").trim() || "ReciclaCAT";
}

function renderCatName() {
  $("catNameTitle").textContent = getCatName();
}

function onDrag(event) {
  event.preventDefault();
  $("dropzone").classList.add("drag");
}
function offDrag(event) {
  event.preventDefault();
  $("dropzone").classList.remove("drag");
}

async function readFile(file) {
  if (!file) return;
  if (!/\.(xlsx|xls)$/i.test(file.name)) return setProgress("Archivo no valido. Usa XLS o XLSX.", 0, 0);
  $("fileInfo").textContent = `${file.name} · ${fmtInt.format(Math.round(file.size / 1024))} KB`;
  setProgress("Leyendo archivo", 8, 0);
  const data = await file.arrayBuffer();
  await nextFrame();
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  loadRows(rows);
}

function loadRows(rows) {
  state.rows = rows;
  state.headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  detectMap();
  fillMapControls();
  processRows();
}

function detectMap() {
  const saved = loadJson(STORAGE.map, {});
  const hasSaved = Object.values(saved).some(Boolean);
  state.map = hasSaved ? saved : {
    date: findHeader(["fecha", "fecha pedido", "fecha del pedido", "fecha venta"]),
    order: findHeader(["n pedido", "nº pedido", "pedido", "referencia", "order id"]),
    notes: findHeader(["observaciones", "observ. pedido", "notas", "comentarios"]),
    amount: findHeader(["total pedido", "importe", "total", "precio"])
  };
}

function findHeader(candidates) {
  return state.headers.find((header) => candidates.some((candidate) => normalize(header).includes(normalize(candidate)))) || "";
}

function fillMapControls() {
  [["mapDate", "date"], ["mapOrder", "order"], ["mapNotes", "notes"], ["mapAmount", "amount"]].forEach(([id, key]) => {
    $(id).innerHTML = `<option value="">Sin asignar</option>${state.headers.map((h) => `<option value="${esc(h)}">${esc(h)}</option>`).join("")}`;
    $(id).value = state.map[key] || "";
    $(id).onchange = () => { updateMapFromControls(); processRows(); };
  });
}

function updateMapFromControls() {
  state.map = { date: $("mapDate").value, order: $("mapOrder").value, notes: $("mapNotes").value, amount: $("mapAmount").value };
}

async function processRows() {
  updateMapFromControls();
  const missing = ["date", "order", "notes", "amount"].filter((key) => !state.map[key]);
  $("validationText").textContent = missing.length ? `Faltan columnas: ${missing.join(", ")}` : "Columnas detectadas. Fechas e importes se validan durante el procesamiento.";
  state.processed = [];
  const total = state.rows.length;
  const batch = 1200;
  for (let i = 0; i < total; i += batch) {
    const part = state.rows.slice(i, i + batch).map(normalizeRow).filter(Boolean);
    state.processed.push(...part);
    setProgress("Procesando registros", total ? Math.round(((i + part.length) / total) * 100) : 0, Math.min(i + batch, total));
    await nextFrame();
  }
  updateChannelFilter();
  applyFilters();
  setProgress(total ? "Procesamiento completado" : "Sin datos cargados", total ? 100 : 0, state.processed.length);
}

function normalizeRow(row, index) {
  const date = parseDate(row[state.map.date]);
  const order = String(row[state.map.order] ?? "");
  const notes = String(row[state.map.notes] ?? "");
  const amount = parseNumber(row[state.map.amount]);
  return {
    id: index,
    raw: row,
    date,
    dateText: date ? date.toISOString().slice(0, 10) : "",
    month: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "Sin fecha",
    year: date ? date.getFullYear() : "Sin fecha",
    order,
    notes,
    amount,
    channel: classify(order, notes)
  };
}

function classify(order, notes) {
  for (const rule of state.rules) {
    const text = rule.field === "notes" ? notes : order;
    if (matchesRule(text, rule)) return rule.channel;
  }
  return "Clientes llamada";
}

function matchesRule(text, rule) {
  const source = String(text || "");
  if (!rule.pattern) return false;
  if (rule.mode === "regex") {
    try { return new RegExp(rule.pattern, "i").test(source); } catch { return false; }
  }
  return normalize(source).includes(normalize(rule.pattern));
}

function applyFilters() {
  const from = $("dateFrom").value ? new Date($("dateFrom").value) : null;
  const to = $("dateTo").value ? new Date($("dateTo").value) : null;
  const channel = $("channelFilter").value;
  const text = normalize($("textFilter").value);
  state.filtered = state.processed.filter((row) => {
    if (from && row.date && row.date < from) return false;
    if (to && row.date && row.date > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59)) return false;
    if (channel && row.channel !== channel) return false;
    if (text && !normalize(`${row.order} ${row.notes} ${row.channel}`).includes(text)) return false;
    return true;
  });
  renderAll();
}

function renderAll() {
  renderKpis();
  renderTables();
  renderCharts();
  renderInventory();
  renderGoals();
}

function renderKpis() {
  const rows = state.filtered;
  const revenue = sum(rows, "amount");
  const byChannel = groupCount(rows, "channel");
  const byMonth = groupCount(rows, "month");
  const leader = maxEntry(byChannel);
  const monthLeader = maxEntry(byMonth);
  const growth = monthlyGrowth(rows);
  const rotation = inventoryRotation();
  $("kpiOrders").textContent = fmtInt.format(rows.length);
  $("kpiRevenue").textContent = fmtMoney.format(revenue);
  $("kpiAvg").textContent = fmtMoney.format(rows.length ? revenue / rows.length : 0);
  $("kpiLeader").textContent = leader[0] || "-";
  $("kpiMonth").textContent = leader[0] ? monthLabel(monthLeader[0]) : "-";
  $("kpiGrowth").textContent = pct(growth);
  $("kpiRotation").textContent = pct(rotation);
  $("kpiHealth").textContent = operationalHealth().label;
  $("channelKpis").innerHTML = CHANNELS.map((ch) => `<article class="channel-card"><span>Total ${ch}</span><strong>${fmtInt.format(byChannel.get(ch) || 0)}</strong></article>`).join("");
}

function renderTables() {
  const monthly = monthlyRows();
  renderSimpleTable("monthlyTable", ["Mes", "Canal", "Pedidos"], monthly.map((r) => [monthLabel(r.month), r.channel, r.count]));
  const byChannel = [...groupCount(state.filtered, "channel")].map(([channel, count]) => {
    const amount = sum(state.filtered.filter((r) => r.channel === channel), "amount");
    return [channel, count, pct(state.filtered.length ? count / state.filtered.length * 100 : 0), fmtMoney.format(amount)];
  });
  renderSimpleTable("channelTable", ["Canal", "Pedidos", "%", "Facturacion"], byChannel);
  renderCrossTable();
  renderDetailTable();
}

function renderCrossTable() {
  const months = [...new Set(state.filtered.map((r) => r.month))].sort();
  const totals = Object.fromEntries(CHANNELS.map((ch) => [ch, 0]));
  const body = months.map((month) => {
    const row = [monthLabel(month)];
    let total = 0;
    CHANNELS.forEach((ch) => {
      const count = state.filtered.filter((r) => r.month === month && r.channel === ch).length;
      row.push(count);
      totals[ch] += count;
      total += count;
    });
    row.push(total);
    return row;
  });
  const totalRow = ["TOTAL", ...CHANNELS.map((ch) => totals[ch]), state.filtered.length];
  renderSimpleTable("crossTable", ["Mes", ...CHANNELS, "Total"], [...body, totalRow]);
}

function renderDetailTable() {
  const q = normalize($("detailSearch").value);
  let rows = state.filtered.filter((row) => !q || normalize(`${row.dateText} ${row.order} ${row.notes} ${row.channel} ${row.amount}`).includes(q));
  rows = rows.sort((a, b) => compare(a[state.sort.key], b[state.sort.key]) * state.sort.dir).slice(0, 1000);
  const headers = [["dateText", "Fecha"], ["order", "Pedido"], ["channel", "Canal"], ["amount", "Importe"], ["notes", "Observaciones"]];
  $("detailTable").innerHTML = `<thead><tr>${headers.map(([key, label]) => `<th data-key="${key}">${label}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.dateText)}</td><td>${esc(r.order)}</td><td>${esc(r.channel)}</td><td>${fmtMoney.format(r.amount)}</td><td>${esc(r.notes)}</td></tr>`).join("")}</tbody>`;
  $("detailTable").querySelectorAll("th").forEach((th) => th.onclick = () => {
    const key = th.dataset.key;
    state.sort.dir = state.sort.key === key ? state.sort.dir * -1 : 1;
    state.sort.key = key;
    renderDetailTable();
  });
}

function renderSimpleTable(id, headers, rows) {
  $(id).innerHTML = `<thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
}

function renderCharts() {
  const style = getComputedStyle(document.body);
  const text = style.getPropertyValue("--text");
  const grid = style.getPropertyValue("--line");
  const colors = ["#1f7a3a", "#1d6fa4", "#c9663d", "#d4a62a", "#7a4fb3", "#d1497b", "#2fa84f", "#607067"];
  const byChannel = CHANNELS.map((ch) => state.filtered.filter((r) => r.channel === ch).length);
  makeChart("chartChannels", "bar", { labels: CHANNELS, datasets: [{ label: "Pedidos", data: byChannel, backgroundColor: colors }] }, text, grid);
  makeChart("chartPie", "doughnut", { labels: CHANNELS, datasets: [{ data: byChannel, backgroundColor: colors }] }, text, grid);
  const months = [...new Set(state.filtered.map((r) => r.month))].sort();
  const datasets = CHANNELS.map((ch, i) => ({ label: ch, data: months.map((m) => state.filtered.filter((r) => r.month === m && r.channel === ch).length), backgroundColor: colors[i] }));
  makeChart("chartStacked", "bar", { labels: months.map(monthLabel), datasets }, text, grid, { stacked: true });
  const monthTotals = months.map((m) => state.filtered.filter((r) => r.month === m).length);
  makeChart("chartTimeline", "line", { labels: months.map(monthLabel), datasets: [{ label: "Pedidos", data: monthTotals, borderColor: colors[0], backgroundColor: "rgba(31,122,58,.14)", tension: .3, fill: true }] }, text, grid);
  let acc = 0;
  makeChart("chartCumulative", "line", { labels: months.map(monthLabel), datasets: [{ label: "Acumulado", data: monthTotals.map((v) => acc += v), borderColor: colors[1], tension: .3 }] }, text, grid);
  makeChart("chartCompare", "bar", { labels: months.map(monthLabel), datasets: [{ label: "Mes", data: monthTotals, backgroundColor: colors[2] }] }, text, grid);
}

function makeChart(id, type, data, text, grid, extra = {}) {
  if (!window.Chart) return;
  charts[id]?.destroy();
  charts[id] = new Chart($(id), {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: text } } },
      scales: type === "doughnut" ? {} : {
        x: { stacked: !!extra.stacked, ticks: { color: text }, grid: { color: grid } },
        y: { stacked: !!extra.stacked, beginAtZero: true, ticks: { color: text }, grid: { color: grid } }
      }
    }
  });
}

function restoreInventory() {
  const inv = loadJson(STORAGE.inventory, { vehicles: 890, stored: 42875, mounted: 140477, date: new Date().toISOString().slice(0, 10), notes: "" });
  $("vehiclesInput").value = inv.vehicles;
  $("storedInput").value = inv.stored;
  $("mountedInput").value = inv.mounted;
  $("inventoryDateInput").value = inv.date;
  $("inventoryNotes").value = inv.notes || "";
}

function saveInventory() {
  const inv = getInventory();
  localStorage.setItem(STORAGE.inventory, JSON.stringify(inv));
  const history = loadJson(STORAGE.history, []);
  history.unshift({ ...inv, savedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 200)));
  renderInventory();
}

function getInventory() {
  return {
    vehicles: Number($("vehiclesInput").value) || 0,
    stored: Number($("storedInput").value) || 0,
    mounted: Number($("mountedInput").value) || 0,
    date: $("inventoryDateInput").value || new Date().toISOString().slice(0, 10),
    notes: $("inventoryNotes").value || ""
  };
}

function renderInventory() {
  const inv = getInventory();
  const total = inv.stored + inv.mounted;
  const days = daysSince(inv.date);
  const health = inventoryHealth(days);
  const rotation = inventoryRotation();
  $("invStored").textContent = fmtInt.format(inv.stored);
  $("invMounted").textContent = fmtInt.format(inv.mounted);
  $("invTotal").textContent = fmtInt.format(total);
  $("invDays").textContent = fmtInt.format(days);
  $("invDateLabel").textContent = inv.date;
  $("mountRatio").textContent = pct(total ? inv.mounted / total * 100 : 0);
  $("storedRatio").textContent = pct(total ? inv.stored / total * 100 : 0);
  $("inventoryDiff").textContent = fmtInt.format(inv.stored - inv.mounted);
  $("rotationClass").textContent = rotationClass(rotation);
  $("inventoryState").textContent = health.label;
  $("inventoryMessage").textContent = health.message;
  $("gaugeValue").textContent = `${health.score}%`;
  $("inventoryGauge").style.setProperty("--pct", health.score);
  $("inventoryGauge").style.setProperty("--gauge-color", health.color);
  const history = loadJson(STORAGE.history, []);
  renderSimpleTable("inventoryHistoryTable", ["Fecha", "Almacenados", "Montados/revisados", "Vehiculos", "Observaciones"], history.map((h) => [h.date, fmtInt.format(h.stored), fmtInt.format(h.mounted), fmtInt.format(h.vehicles || 0), h.notes || ""]));
}

function inventoryHealth(days) {
  if (days < 60) return { label: "OPTIMO", score: 100, color: "#1f7a3a", message: "Inventario actualizado y fiable." };
  if (days <= 90) return { label: "BUENO", score: 75, color: "#2fa84f", message: "Conviene programar una revision preventiva." };
  if (days <= 180) return { label: "ATENCION", score: 50, color: "#d4a62a", message: "Se recomienda realizar inventario proximamente." };
  if (days <= 365) return { label: "CRITICO", score: 25, color: "#c9663d", message: "Revision urgente recomendada." };
  return { label: "RIESGO ALTO", score: 0, color: "#bf2d2d", message: "Inventario altamente desactualizado. Auditoria inmediata recomendada." };
}

function inventoryRotation() {
  const stored = Number($("storedInput")?.value) || 42875;
  return stored ? state.filtered.length / stored * 100 : 0;
}

function operationalHealth() {
  const inv = inventoryHealth(daysSince(getInventory().date)).score;
  const growth = monthlyGrowth(state.filtered);
  const rotation = inventoryRotation();
  const volume = Math.min(100, state.filtered.length);
  const score = inv * .35 + Math.max(0, Math.min(100, growth + 50)) * .2 + Math.min(100, rotation * 5) * .25 + volume * .2;
  if (score >= 80) return { label: "Excelente", score };
  if (score >= 65) return { label: "Buena", score };
  if (score >= 45) return { label: "Atencion", score };
  if (score >= 25) return { label: "Riesgo", score };
  return { label: "Critica", score };
}

function saveGoals() {
  const goals = { orders: Number($("goalOrders").value) || 0, revenue: Number($("goalRevenue").value) || 0, rotation: Number($("goalRotation").value) || 0 };
  localStorage.setItem(STORAGE.goals, JSON.stringify(goals));
  renderGoals();
}
function restoreGoals() {
  const goals = loadJson(STORAGE.goals, { orders: 100, revenue: 10000, rotation: 10 });
  $("goalOrders").value = goals.orders;
  $("goalRevenue").value = goals.revenue;
  $("goalRotation").value = goals.rotation;
}
function renderGoals() {
  const revenue = sum(state.filtered, "amount");
  const goals = { orders: Number($("goalOrders").value) || 0, revenue: Number($("goalRevenue").value) || 0, rotation: Number($("goalRotation").value) || 0 };
  const items = [
    ["Pedidos", state.filtered.length, goals.orders, ""],
    ["Facturacion", revenue, goals.revenue, "money"],
    ["Rotacion", inventoryRotation(), goals.rotation, "pct"]
  ];
  $("goalBars").innerHTML = items.map(([label, value, goal, type]) => {
    const p = goal ? Math.min(100, value / goal * 100) : 0;
    const valueText = type === "money" ? fmtMoney.format(value) : type === "pct" ? pct(value) : fmtInt.format(value);
    return `<div class="goal"><strong>${label}: ${valueText} / ${type === "money" ? fmtMoney.format(goal) : type === "pct" ? pct(goal) : fmtInt.format(goal)}</strong><div><i style="width:${p}%"></i></div></div>`;
  }).join("");
}

function renderRules() {
  $("rulesList").innerHTML = state.rules.map((rule, index) => `
    <div class="rule-row">
      <label>Canal <input data-rule="${index}" data-key="channel" value="${esc(rule.channel)}"></label>
      <label>Campo <select data-rule="${index}" data-key="field"><option value="order"${rule.field === "order" ? " selected" : ""}>Pedido</option><option value="notes"${rule.field === "notes" ? " selected" : ""}>Observaciones</option></select></label>
      <label>Patron <input data-rule="${index}" data-key="pattern" value="${esc(rule.pattern)}"></label>
      <button type="button" data-delete="${index}">Eliminar</button>
    </div>`).join("");
  $("rulesList").querySelectorAll("[data-rule]").forEach((el) => el.oninput = (e) => {
    state.rules[Number(e.target.dataset.rule)][e.target.dataset.key] = e.target.value;
    saveRules();
    processRows();
  });
  $("rulesList").querySelectorAll("[data-delete]").forEach((btn) => btn.onclick = () => {
    state.rules.splice(Number(btn.dataset.delete), 1);
    saveRules();
    renderRules();
    processRows();
  });
}
function saveRules() { localStorage.setItem(STORAGE.rules, JSON.stringify(state.rules)); }

function exportXlsx() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Resumen Ejecutivo"], ["CAT", getCatName()], ["Periodo", periodText()], ["Pedidos", state.filtered.length], ["Facturacion", sum(state.filtered, "amount")], ["Ticket medio", state.filtered.length ? sum(state.filtered, "amount") / state.filtered.length : 0], ["Canal lider", maxEntry(groupCount(state.filtered, "channel"))[0] || ""], ["Inventario total", getInventory().stored + getInventory().mounted], ["Salud inventario", inventoryHealth(daysSince(getInventory().date)).label], ["Salud operativa", operationalHealth().label]]), "Resumen Ejecutivo");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.filtered.map((r) => ({ Fecha: r.dateText, Pedido: r.order, Canal: r.channel, Importe: r.amount, Observaciones: r.notes }))), "Detalle Pedidos");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Mes", "Canal", "Pedidos"], ...monthlyRows().map((r) => [r.month, r.channel, r.count])]), "Mensual");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Canal", "Pedidos"], ...[...groupCount(state.filtered, "channel")]]), "Canales");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["KPI", "Valor"], ["Crecimiento mensual", monthlyGrowth(state.filtered)], ["Rotacion", inventoryRotation()], ["Salud operativa", operationalHealth().label]]), "KPIs");
  const inv = getInventory();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Vehiculos", inv.vehicles], ["Almacenados", inv.stored], ["Montados/revisados", inv.mounted], ["Total", inv.stored + inv.mounted], ["Fecha", inv.date], ["Estado", inventoryHealth(daysSince(inv.date)).label]]), "Inventario");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Objetivo", "Valor"], ["Pedidos", $("goalOrders").value], ["Facturacion", $("goalRevenue").value], ["Rotacion", $("goalRotation").value]]), "Objetivos");
  XLSX.writeFile(wb, "reciclacat-dashboard.xlsx");
}

async function exportPdf() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const inv = getInventory();
  pdf.setFontSize(22); pdf.text(`${getCatName()} - Informe ejecutivo`, 14, 18);
  pdf.setFontSize(10);
  const lines = [
    `CAT: ${getCatName()}`,
    `Fecha de generacion: ${new Date().toLocaleString("es-ES")}`,
    `Periodo analizado: ${periodText()}`,
    `Pedidos totales: ${fmtInt.format(state.filtered.length)}`,
    `Facturacion total: ${fmtMoney.format(sum(state.filtered, "amount"))}`,
    `Ticket medio: ${fmtMoney.format(state.filtered.length ? sum(state.filtered, "amount") / state.filtered.length : 0)}`,
    `Canal lider: ${maxEntry(groupCount(state.filtered, "channel"))[0] || "-"}`,
    `Mes lider: ${monthLabel(maxEntry(groupCount(state.filtered, "month"))[0]) || "-"}`,
    `Inventario total: ${fmtInt.format(inv.stored + inv.mounted)}`,
    `Fecha ultimo inventario: ${inv.date}`,
    `Estado inventario: ${inventoryHealth(daysSince(inv.date)).label}`,
    `Salud operativa: ${operationalHealth().label}`,
    `Recomendacion: ${automaticRecommendation()}`
  ];
  lines.forEach((line, i) => pdf.text(line, 14, 32 + i * 7));
  const canvas = await html2canvas($("report"), { scale: 1, backgroundColor: getComputedStyle(document.body).backgroundColor });
  const img = canvas.toDataURL("image/jpeg", .75);
  pdf.addPage();
  pdf.addImage(img, "JPEG", 0, 0, 210, Math.min(297, canvas.height * 210 / canvas.width));
  pdf.save("reciclacat-informe.pdf");
}

function loadDemo() {
  const rows = Array.from({ length: 850 }, (_, i) => {
    const channels = ["ZLR", "RV4", "RF", "RRR", "07-14791-85477", "wallapop", "Ecooparts", "P-"];
    const token = channels[i % channels.length];
    return {
      "Fecha pedido": new Date(2026, i % 12, (i % 27) + 1),
      "Nº Pedido": token === "P-" ? `P-${1000 + i}` : `${token}-${1000 + i}`,
      "Observaciones": token === "07-14791-85477" ? `Venta ebay ${token}` : token,
      "Total pedido": Math.round((35 + (i % 90) * 6.25) * 100) / 100
    };
  });
  $("fileInfo").textContent = "Demo interna · 850 registros";
  loadRows(rows);
}

function updateChannelFilter() {
  const current = $("channelFilter").value;
  $("channelFilter").innerHTML = `<option value="">Todos</option>${CHANNELS.map((ch) => `<option value="${ch}">${ch}</option>`).join("")}`;
  $("channelFilter").value = current;
}
function resetFilters() {
  ["dateFrom", "dateTo", "channelFilter", "textFilter", "detailSearch"].forEach((id) => $(id).value = "");
  applyFilters();
}
function monthlyRows() {
  const map = new Map();
  state.filtered.forEach((r) => map.set(`${r.month}|${r.channel}`, (map.get(`${r.month}|${r.channel}`) || 0) + 1));
  return [...map].map(([key, count]) => {
    const [month, channel] = key.split("|");
    return { month, channel, count };
  }).sort((a, b) => a.month.localeCompare(b.month) || a.channel.localeCompare(b.channel));
}
function groupCount(rows, key) {
  const map = new Map();
  rows.forEach((row) => map.set(row[key], (map.get(row[key]) || 0) + 1));
  return map;
}
function monthlyGrowth(rows) {
  const months = [...new Set(rows.map((r) => r.month))].filter((m) => m !== "Sin fecha").sort();
  if (months.length < 2) return 0;
  const prev = rows.filter((r) => r.month === months[months.length - 2]).length;
  const curr = rows.filter((r) => r.month === months[months.length - 1]).length;
  return prev ? (curr - prev) / prev * 100 : 0;
}
function automaticRecommendation() {
  const h = inventoryHealth(daysSince(getInventory().date));
  if (h.score <= 25) return "Priorizar auditoria de inventario y revision de campa.";
  if (inventoryRotation() < 5) return "Revisar rotacion comercial y canales con menor salida.";
  return "Mantener seguimiento mensual y actualizar objetivos.";
}
function periodText() {
  const dates = state.filtered.map((r) => r.date).filter(Boolean).sort((a, b) => a - b);
  return dates.length ? `${dates[0].toLocaleDateString("es-ES")} - ${dates[dates.length - 1].toLocaleDateString("es-ES")}` : "Sin periodo";
}
function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value)) return value;
  if (!value) return null;
  const text = String(value).trim();
  const m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) return new Date(Number(m[3].padStart(4, "20")), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}
function parseNumber(value) {
  if (typeof value === "number") return value;
  return Number(String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
}
function daysSince(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 9999;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}
function rotationClass(v) {
  if (v > 20) return "Excelente";
  if (v >= 10) return "Buena";
  if (v >= 5) return "Mejorable";
  return "Baja";
}
function maxEntry(map) {
  return [...map].sort((a, b) => b[1] - a[1])[0] || ["", 0];
}
function sum(rows, key) { return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0); }
function monthLabel(month) {
  if (!month || month === "Sin fecha") return month || "-";
  const [y, m] = month.split("-");
  return `${m}/${y}`;
}
function pct(value) { return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)}%`; }
function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
}
function compare(a, b) {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}
function setProgress(text, pctValue, processed) {
  $("progressText").textContent = text;
  $("progressBar").style.width = `${pctValue}%`;
  $("processedText").textContent = `${fmtInt.format(processed)} registros procesados`;
}
function nextFrame() { return new Promise((resolve) => requestAnimationFrame(resolve)); }
function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
