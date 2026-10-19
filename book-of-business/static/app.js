"use strict";

const STATUSES = [
  "Submitted", "Underwriting", "Approved", "Issued", "In Force",
  "Declined", "Not Taken", "Lapsed", "Cancelled",
];
const INFORCE = new Set(["Issued", "In Force"]);
const PENDING = new Set(["Submitted", "Underwriting", "Approved"]);
const TERMINATED = new Set(["Lapsed", "Cancelled"]);
const STATUS_TONE = {
  "Submitted": "info", "Underwriting": "info", "Approved": "warn",
  "Issued": "good", "In Force": "good",
  "Declined": "bad", "Not Taken": "", "Lapsed": "bad", "Cancelled": "",
};
const PRODUCT_TYPES = [
  "Term", "Whole Life", "IUL", "Universal Life", "Final Expense",
  "Mortgage Protection", "Annuity", "Other",
];
const MODES = { "Monthly": 12, "Quarterly": 4, "Semi-Annual": 2, "Annual": 1 };

const state = {
  clients: [],
  policies: [],
  policySort: { key: "app_date", asc: false },
  clientSort: { key: "name", asc: true },
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- formatting ----------
const money = (n) => "$" + Math.round(n || 0).toLocaleString();
const money2 = (n) => "$" + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function compactMoney(n) {
  const a = Math.abs(n || 0);
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1e4) return "$" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return money(n);
}
function parseDate(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function fmtDate(s) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}
function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
function age(dob) {
  const d = parseDate(dob);
  if (!d) return null;
  const t = today();
  let a = t.getFullYear() - d.getFullYear();
  if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}
// Next occurrence (today or later) of a month/day taken from a date string.
function nextAnniversary(s) {
  const d = parseDate(s);
  if (!d) return null;
  const t = today();
  let n = new Date(t.getFullYear(), d.getMonth(), d.getDate());
  if (n < t) n = new Date(t.getFullYear() + 1, d.getMonth(), d.getDate());
  return n;
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clientName = (c) => [c.first_name, c.last_name].filter(Boolean).join(" ");
const estCommission = (p) => (p.annual_premium || 0) * (p.commission_rate || 0) / 100;
const pill = (status) => `<span class="pill ${STATUS_TONE[status] || ""}">${esc(status || "—")}</span>`;
const toNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 2600);
}

// ---------- API ----------
async function api(method, path, body) {
  // Standalone single-file build: no server, data lives in this browser.
  if (window.LocalStore) return window.LocalStore.request(method, path, body);
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = typeof body === "string" ? "text/csv" : "application/json";
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function load() {
  [state.clients, state.policies] = await Promise.all([api("GET", "/api/clients"), api("GET", "/api/policies")]);
  renderAll();
}

function renderAll() {
  renderDatalists();
  renderDashboard();
  renderPolicies();
  renderClients();
}

// ---------- tabs ----------
function showView(name) {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
  $$(".view").forEach((v) => (v.hidden = v.id !== `view-${name}`));
  try { localStorage.setItem("bob.view", name); } catch {}
}

// ---------- dashboard ----------
function renderDashboard() {
  const ps = state.policies;
  const inforce = ps.filter((p) => INFORCE.has(p.status));
  const pending = ps.filter((p) => PENDING.has(p.status));
  const terminated = ps.filter((p) => TERMINATED.has(p.status));
  const sum = (arr, f) => arr.reduce((s, p) => s + (typeof f === "function" ? f(p) : p[f] || 0), 0);
  const year = today().getFullYear();
  const ytd = ps.filter((p) => parseDate(p.app_date)?.getFullYear() === year);
  const persistBase = inforce.length + terminated.length;

  $("#hero-ap").textContent = money(sum(inforce, "annual_premium"));
  const tiles = [
    ["Policies in force", inforce.length.toLocaleString(), `${state.clients.length.toLocaleString()} clients`],
    ["Face amount in force", compactMoney(sum(inforce, "face_amount")), "Total coverage"],
    ["Pending", pending.length.toLocaleString(), `${money(sum(pending, "annual_premium"))} annual premium`],
    [`Written ${year}`, money(sum(ytd, "annual_premium")), `${ytd.length} applications`],
    ["Commission paid", money(sum(ps, "commission_paid")), `${money(sum(ps, "chargeback"))} charged back`],
    ["Persistency", persistBase ? Math.round((inforce.length / persistBase) * 100) + "%" : "—", `${terminated.length} lapsed or cancelled`],
  ];
  $("#tiles").innerHTML = tiles.map(([l, v, n]) =>
    `<div class="tile"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div><div class="note">${esc(n)}</div></div>`
  ).join("");

  // Monthly production, last 12 months by app date
  const t = today();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: "short" }), full: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }), value: 0, count: 0 });
  }
  const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
  ps.forEach((p) => {
    const d = parseDate(p.app_date);
    const m = d && byKey[`${d.getFullYear()}-${d.getMonth()}`];
    if (m && !["Declined", "Not Taken"].includes(p.status)) { m.value += p.annual_premium || 0; m.count++; }
  });
  columnChart($("#chart-monthly"), months.map((m) => ({
    label: m.label, value: m.value,
    tip: `<b>${esc(m.full)}</b><br>${money(m.value)} annual premium<br>${m.count} application${m.count === 1 ? "" : "s"}`,
  })));

  // In-force AP by carrier (top 7, rest folded into Other)
  const carriers = {};
  inforce.forEach((p) => {
    const c = p.carrier || "Unknown";
    carriers[c] = carriers[c] || { value: 0, count: 0 };
    carriers[c].value += p.annual_premium || 0;
    carriers[c].count++;
  });
  let rows = Object.entries(carriers).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.value - a.value);
  if (rows.length > 8) {
    const rest = rows.slice(7);
    rows = rows.slice(0, 7).concat({ label: "Other", value: rest.reduce((s, r) => s + r.value, 0), count: rest.reduce((s, r) => s + r.count, 0) });
  }
  barChart($("#chart-carrier"), rows.map((r) => ({
    label: r.label, value: r.value,
    tip: `<b>${esc(r.label)}</b><br>${money(r.value)} annual premium<br>${r.count} polic${r.count === 1 ? "y" : "ies"}`,
  })));

  renderAttention();
  renderUpcoming();
}

function renderAttention() {
  const t = today();
  const items = [];
  state.policies.forEach((p) => {
    const f = parseDate(p.follow_up_date);
    if (f && daysBetween(t, f) <= 14 && !TERMINATED.has(p.status)) {
      const d = daysBetween(t, f);
      items.push({ sort: d, p, html: `<span class="${d < 0 ? "overdue" : ""}">${d < 0 ? `${-d}d overdue` : d === 0 ? "Today" : `In ${d}d`}</span>`, why: "Follow-up" });
    }
    const a = parseDate(p.app_date);
    if (PENDING.has(p.status) && a && daysBetween(a, t) > 30) {
      items.push({ sort: -daysBetween(a, t), p, html: `${daysBetween(a, t)}d pending`, why: p.status });
    }
  });
  items.sort((a, b) => a.sort - b.sort);
  $("#list-attention").innerHTML = items.length ? items.slice(0, 12).map((it) => `
    <li class="clickable" data-policy="${it.p.id}">
      <div class="what"><b>${esc(clientName(it.p))}</b> · ${esc(it.p.carrier)} ${esc(it.p.product_type)}
        <div class="meta">${esc(it.why)}${it.p.notes ? " · " + esc(it.p.notes.slice(0, 70)) : ""}</div></div>
      <div class="meta">${it.html}</div>
    </li>`).join("") : `<li class="none">Nothing due. Nice work.</li>`;
}

function renderUpcoming() {
  const t = today();
  const items = [];
  state.clients.forEach((c) => {
    const n = nextAnniversary(c.dob);
    if (n && daysBetween(t, n) <= 30) {
      const turning = age(c.dob) + (daysBetween(t, n) === 0 ? 0 : 1);
      items.push({ d: daysBetween(t, n), html: `<b>${esc(clientName(c))}</b> turns ${turning}`, meta: "Birthday — age change can affect rates", client: c.id });
    }
  });
  state.policies.filter((p) => INFORCE.has(p.status)).forEach((p) => {
    const n = nextAnniversary(p.effective_date);
    const eff = parseDate(p.effective_date);
    if (n && eff && n > eff && daysBetween(t, n) <= 30) {
      const yrs = n.getFullYear() - eff.getFullYear();
      items.push({ d: daysBetween(t, n), html: `<b>${esc(clientName(p))}</b> · ${esc(p.carrier)} ${yrs}-year anniversary`, meta: "Policy anniversary — good time for a review", policy: p.id });
    }
  });
  items.sort((a, b) => a.d - b.d);
  $("#list-upcoming").innerHTML = items.length ? items.slice(0, 12).map((it) => `
    <li class="clickable" ${it.policy ? `data-policy="${it.policy}"` : `data-client="${it.client}"`}>
      <div class="what">${it.html}<div class="meta">${esc(it.meta)}</div></div>
      <div class="meta">${it.d === 0 ? "Today" : `In ${it.d}d`}</div>
    </li>`).join("") : `<li class="none">No birthdays or anniversaries in the next 30 days.</li>`;
}

// ---------- charts (single series, so no legend; title names the measure) ----------
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function roundedTopRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  if (h <= 0) return "";
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
function roundedRightRect(x, y, w, h, r) {
  r = Math.min(r, h / 2, w);
  if (w <= 0) return "";
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

// Draw at the container's real width so text stays 11px on every screen.
const chartWidth = (el) => Math.max(260, Math.floor(el.clientWidth || 560));

function columnChart(el, data) {
  if (!data.some((d) => d.value > 0)) {
    el.innerHTML = `<div class="chart-empty">No applications in the last 12 months yet.</div>`;
    return;
  }
  const W = chartWidth(el), H = 230, L = 48, R = 8, T = 12, B = 24;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const iw = W - L - R, ih = H - T - B;
  const step = iw / data.length, bw = Math.min(28, step - 4);
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Annual premium written by month">`;
  for (let i = 0; i <= 4; i++) {
    const y = T + ih - (ih * i) / 4;
    svg += `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`;
    svg += `<text class="axis-label" x="${L - 6}" y="${y + 4}" text-anchor="end">${compactMoney((max * i) / 4)}</text>`;
  }
  data.forEach((d, i) => {
    const x = L + step * i + (step - bw) / 2;
    const h = (d.value / max) * ih;
    svg += `<g data-tip="${esc(d.tip)}">
      <rect class="hit" x="${L + step * i}" y="${T}" width="${step}" height="${ih + B}"/>
      <path class="bar" d="${roundedTopRect(x, T + ih - h, bw, h, 4)}"/>
      ${step >= 32 || (data.length - 1 - i) % 2 === 0 ? `<text class="axis-label" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>` : ""}
    </g>`;
  });
  el.innerHTML = svg + "</svg>";
}

function barChart(el, data) {
  if (!data.length) {
    el.innerHTML = `<div class="chart-empty">No issued or in-force policies yet.</div>`;
    return;
  }
  const rowH = 28, L = 120, R = 64, W = chartWidth(el), H = data.length * rowH + 4;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const iw = W - L - R;
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="In-force annual premium by carrier">`;
  data.forEach((d, i) => {
    const y = i * rowH + 4, bh = 18;
    const w = Math.max((d.value / max) * iw, d.value > 0 ? 2 : 0);
    const label = d.label.length > 17 ? d.label.slice(0, 16) + "…" : d.label;
    svg += `<g data-tip="${esc(d.tip)}">
      <rect class="hit" x="0" y="${y - 3}" width="${W}" height="${rowH}"/>
      <text class="axis-label" x="${L - 8}" y="${y + 13}" text-anchor="end">${esc(label)}</text>
      <path class="bar" d="${roundedRightRect(L, y, w, bh, 4)}"/>
      <text class="value-label" x="${L + w + 6}" y="${y + 13}">${compactMoney(d.value)}</text>
    </g>`;
  });
  el.innerHTML = svg + "</svg>";
}

function wireTooltips() {
  const tip = $("#tooltip");
  document.addEventListener("mousemove", (e) => {
    const g = e.target.closest?.("[data-tip]");
    if (!g) { tip.hidden = true; return; }
    tip.innerHTML = g.dataset.tip;
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px";
    tip.style.top = e.clientY + 14 + "px";
  });
}

// ---------- policies table ----------
function policySortValue(p, key) {
  if (key === "client") return (p.last_name + " " + p.first_name).toLowerCase();
  if (key === "commission") return estCommission(p);
  if (key === "status") return STATUSES.indexOf(p.status);
  const v = p[key];
  return typeof v === "string" ? v.toLowerCase() : v ?? 0;
}
function sortRows(rows, sort, valueFn) {
  return rows.sort((a, b) => {
    const va = valueFn(a, sort.key), vb = valueFn(b, sort.key);
    // Empty strings always go last
    if (va === "" && vb !== "") return 1;
    if (vb === "" && va !== "") return -1;
    return (va < vb ? -1 : va > vb ? 1 : 0) * (sort.asc ? 1 : -1);
  });
}
function markSorted(table, sort) {
  $$("th", table).forEach((th) => {
    th.classList.toggle("sorted", th.dataset.sort === sort.key);
    th.classList.toggle("asc", th.dataset.sort === sort.key && sort.asc);
  });
}

function filteredPolicies() {
  const q = $("#policy-search").value.trim().toLowerCase();
  const st = $("#policy-status-filter").value;
  const ca = $("#policy-carrier-filter").value;
  return state.policies.filter((p) => {
    if (st === "__inforce" ? !INFORCE.has(p.status) : st === "__pending" ? !PENDING.has(p.status) : st && p.status !== st) return false;
    if (ca && p.carrier !== ca) return false;
    if (!q) return true;
    return [clientName(p), p.carrier, p.product_type, p.product_name, p.policy_number, p.beneficiary, p.notes, p.phone, p.email]
      .some((v) => (v || "").toLowerCase().includes(q));
  });
}

function renderPolicies() {
  const rows = sortRows(filteredPolicies(), state.policySort, policySortValue);
  const t = today();
  $("#policy-table tbody").innerHTML = rows.map((p) => {
    const f = parseDate(p.follow_up_date);
    const overdue = f && f < t && !TERMINATED.has(p.status);
    return `<tr data-policy="${p.id}">
      <td>${esc(clientName(p))}</td>
      <td>${esc(p.carrier)}</td>
      <td>${esc(p.product_type)}${p.product_name ? ` <span class="meta" style="color:var(--text-3)">${esc(p.product_name)}</span>` : ""}</td>
      <td>${esc(p.policy_number)}</td>
      <td>${pill(p.status)}</td>
      <td class="num">${p.face_amount ? money(p.face_amount) : ""}</td>
      <td class="num">${p.annual_premium ? money2(p.annual_premium) : ""}</td>
      <td class="num">${estCommission(p) ? money(estCommission(p)) : ""}</td>
      <td>${fmtDate(p.app_date)}</td>
      <td class="${overdue ? "overdue" : ""}">${fmtDate(p.follow_up_date)}</td>
    </tr>`;
  }).join("");
  $("#policy-empty").hidden = state.policies.length > 0;
  const ap = rows.reduce((s, p) => s + (p.annual_premium || 0), 0);
  const face = rows.reduce((s, p) => s + (p.face_amount || 0), 0);
  $("#policy-summary").textContent = state.policies.length
    ? `${rows.length} of ${state.policies.length} policies · ${money(ap)} annual premium · ${compactMoney(face)} face`
    : "";
  markSorted($("#policy-table"), state.policySort);
}

// ---------- clients table ----------
function clientSortValue(c, key) {
  if (key === "name") return (c.last_name + " " + c.first_name).toLowerCase();
  const v = c[key];
  return typeof v === "string" ? v.toLowerCase() : v ?? 0;
}
function renderClients() {
  const q = $("#client-search").value.trim().toLowerCase();
  const rows = sortRows(state.clients.filter((c) => !q ||
    [clientName(c), c.phone, c.email, c.city, c.state, c.zip, c.source, c.notes].some((v) => (v || "").toLowerCase().includes(q))
  ), state.clientSort, clientSortValue);
  $("#client-table tbody").innerHTML = rows.map((c) => {
    const a = age(c.dob);
    return `<tr data-client="${c.id}">
      <td>${esc(clientName(c))}</td>
      <td>${fmtDate(c.dob)}${a !== null ? ` · ${a}` : ""}</td>
      <td>${esc(c.phone)}</td>
      <td>${esc(c.email)}</td>
      <td>${esc(c.state)}</td>
      <td class="num">${c.policy_count || ""}</td>
      <td class="num">${c.inforce_premium ? money2(c.inforce_premium) : ""}</td>
    </tr>`;
  }).join("");
  $("#client-empty").hidden = state.clients.length > 0;
  markSorted($("#client-table"), state.clientSort);
}

// ---------- dropdowns ----------
function fillSelect(sel, options, keepFirst) {
  const first = keepFirst ? sel.options[0].outerHTML : "";
  sel.innerHTML = first + options.map((o) => typeof o === "string"
    ? `<option>${esc(o)}</option>` : `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
}
function renderDatalists() {
  const carriers = [...new Set(state.policies.map((p) => p.carrier).filter(Boolean))].sort();
  $("#carrier-options").innerHTML = carriers.map((c) => `<option value="${esc(c)}">`).join("");
  const sources = [...new Set(state.clients.map((c) => c.source).filter(Boolean))].sort();
  $("#source-options").innerHTML = sources.map((c) => `<option value="${esc(c)}">`).join("");

  const cf = $("#policy-carrier-filter"), cfVal = cf.value;
  fillSelect(cf, carriers, true);
  cf.value = carriers.includes(cfVal) ? cfVal : "";
}

// ---------- client dialog ----------
const clientDialog = $("#client-dialog");
const clientForm = $("#client-form");
let clientDialogReturn = null; // callback(newClientId) when opened from the policy form

function openClient(id, onSaved) {
  const c = state.clients.find((x) => x.id === id);
  clientDialogReturn = onSaved || null;
  clientForm.reset();
  clientForm.dataset.id = c ? c.id : "";
  $("#client-dialog-title").textContent = c ? clientName(c) : "New client";
  $("#client-delete").hidden = !c;
  if (c) for (const el of clientForm.elements) if (el.name && el.name in c) el.value = c[el.name] ?? "";

  const box = $("#client-policies");
  if (c) {
    const ps = state.policies.filter((p) => p.client_id === c.id);
    box.innerHTML = `<h3>Policies (${ps.length})</h3>` + (ps.length ? `<ul class="list">${ps.map((p) => `
      <li class="clickable" data-policy="${p.id}"><div class="what"><b>${esc(p.carrier)}</b> ${esc(p.product_type)} ${esc(p.policy_number)}
      <div class="meta">${p.face_amount ? money(p.face_amount) + " face · " : ""}${money2(p.annual_premium)}/yr</div></div>${pill(p.status)}</li>`).join("")}</ul>` : "")
      + `<button type="button" class="btn small" data-new-policy-for="${c.id}">+ Add policy for ${esc(c.first_name || clientName(c))}</button>`;
  } else {
    box.innerHTML = "";
  }
  clientDialog.showModal();
}

clientForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(clientForm));
  data.state = (data.state || "").toUpperCase();
  const id = clientForm.dataset.id;
  try {
    const res = id ? await api("PUT", `/api/clients/${id}`, data) : await api("POST", "/api/clients", data);
    clientDialog.close();
    await load();
    toast(id ? "Client saved" : "Client added");
    if (clientDialogReturn) clientDialogReturn(res.id);
  } catch (err) { toast(err.message); }
});

$("#client-delete").addEventListener("click", async () => {
  const id = clientForm.dataset.id;
  const n = state.policies.filter((p) => String(p.client_id) === id).length;
  if (!confirm(`Delete this client${n ? ` and their ${n} polic${n === 1 ? "y" : "ies"}` : ""}? This can't be undone.`)) return;
  try {
    await api("DELETE", `/api/clients/${id}`);
    clientDialog.close();
    await load();
    toast("Client deleted");
  } catch (err) { toast(err.message); }
});

// ---------- policy dialog ----------
const policyDialog = $("#policy-dialog");
const policyForm = $("#policy-form");
const pf = (name) => policyForm.elements[name];

function fillClientSelect(selectedId) {
  const sorted = [...state.clients].sort((a, b) => clientSortValue(a, "name") < clientSortValue(b, "name") ? -1 : 1);
  fillSelect(pf("client_id"), [{ value: "", label: "Select a client…" }, ...sorted.map((c) => ({ value: c.id, label: clientName(c) + (c.dob ? ` (${fmtDate(c.dob)})` : "") }))]);
  pf("client_id").value = selectedId ?? "";
}

function updatePremiumFields(source) {
  const periods = MODES[pf("payment_mode").value] || 12;
  if (source === "modal") pf("annual_premium").value = pf("modal_premium").value ? (toNum(pf("modal_premium").value) * periods).toFixed(2) : "";
  else pf("modal_premium").value = pf("annual_premium").value ? (toNum(pf("annual_premium").value) / periods).toFixed(2) : "";
  const est = toNum(pf("annual_premium").value) * toNum(pf("commission_rate").value) / 100;
  pf("est_commission").value = est ? money2(est) : "";
}

function openPolicy(id, presetClientId) {
  const p = state.policies.find((x) => x.id === id);
  policyForm.reset();
  policyForm.dataset.id = p ? p.id : "";
  $("#policy-dialog-title").textContent = p ? `${clientName(p)} — ${p.carrier || "Policy"}` : "New policy";
  $("#policy-delete").hidden = !p;
  fillClientSelect(p ? p.client_id : presetClientId);
  if (p) {
    for (const el of policyForm.elements) {
      if (!el.name || !(el.name in p) || el.name === "client_id") continue;
      const v = p[el.name];
      el.value = typeof v === "number" ? (v ? String(v) : "") : v ?? "";
    }
  } else {
    pf("status").value = "Submitted";
    pf("payment_mode").value = "Monthly";
    pf("app_date").value = new Date().toLocaleDateString("en-CA");
  }
  updatePremiumFields("annual");
  policyDialog.showModal();
}

policyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(policyForm));
  delete data.modal_premium;
  delete data.est_commission;
  const id = policyForm.dataset.id;
  try {
    id ? await api("PUT", `/api/policies/${id}`, data) : await api("POST", "/api/policies", data);
    policyDialog.close();
    await load();
    toast(id ? "Policy saved" : "Policy added");
  } catch (err) { toast(err.message); }
});

$("#policy-delete").addEventListener("click", async () => {
  if (!confirm("Delete this policy? This can't be undone.")) return;
  try {
    await api("DELETE", `/api/policies/${policyForm.dataset.id}`);
    policyDialog.close();
    await load();
    toast("Policy deleted");
  } catch (err) { toast(err.message); }
});

pf("modal_premium").addEventListener("input", () => updatePremiumFields("modal"));
pf("annual_premium").addEventListener("input", () => updatePremiumFields("annual"));
pf("payment_mode").addEventListener("change", () => updatePremiumFields(pf("modal_premium").value ? "modal" : "annual"));
pf("commission_rate").addEventListener("input", () => updatePremiumFields("annual"));

$("#policy-new-client").addEventListener("click", () => {
  // Keep the policy dialog open underneath; select the new client when saved.
  openClient(null, (newId) => fillClientSelect(newId));
});

// ---------- import ----------
$("#btn-import").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const res = await api("POST", "/api/import", await file.text());
    await load();
    toast(`Imported ${res.clients_added} new clients and ${res.policies_added} policies` +
      (res.policies_skipped ? ` (${res.policies_skipped} duplicates skipped)` : ""));
  } catch (err) { toast("Import failed: " + err.message); }
});

// ---------- export ----------
$("#btn-export").addEventListener("click", async () => {
  try {
    let csv;
    if (window.LocalStore) csv = await window.LocalStore.request("GET", "/api/export");
    else {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      csv = await res.text();
    }
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `book-of-business-${new Date().toLocaleDateString("en-CA")}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) { toast("Export failed: " + err.message); }
});

// ---------- global wiring ----------
function init() {
  fillSelect($("#policy-status-filter"), [
    { value: "__inforce", label: "In force (Issued + In Force)" },
    { value: "__pending", label: "Pending (not yet issued)" },
    ...STATUSES,
  ], true);
  fillSelect(pf("status"), STATUSES);
  fillSelect(pf("product_type"), PRODUCT_TYPES);
  fillSelect(pf("payment_mode"), Object.keys(MODES));

  $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
  let saved = null;
  try { saved = localStorage.getItem("bob.view"); } catch {}
  if (saved && $(`#view-${saved}`)) showView(saved);

  document.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "new-policy") return openPolicy(null);
    if (action === "new-client") return openClient(null);
    if (e.target.closest("[data-close]")) return e.target.closest("dialog").close();
    const forClient = e.target.closest("[data-new-policy-for]");
    if (forClient) { clientDialog.close(); return openPolicy(null, +forClient.dataset.newPolicyFor); }
    const sortTh = e.target.closest("th[data-sort]");
    if (sortTh) {
      const isPolicy = !!sortTh.closest("#policy-table");
      const s = isPolicy ? state.policySort : state.clientSort;
      if (s.key === sortTh.dataset.sort) s.asc = !s.asc; else { s.key = sortTh.dataset.sort; s.asc = true; }
      return isPolicy ? renderPolicies() : renderClients();
    }
    const pol = e.target.closest("[data-policy]");
    if (pol) { if (clientDialog.open) clientDialog.close(); return openPolicy(+pol.dataset.policy); }
    const cli = e.target.closest("[data-client]");
    if (cli) return openClient(+cli.dataset.client);
  });

  ["#policy-search", "#policy-status-filter", "#policy-carrier-filter"].forEach((s) => $(s).addEventListener("input", renderPolicies));
  $("#client-search").addEventListener("input", renderClients);
  wireTooltips();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderDashboard, 150);
  });
  load().catch((err) => toast("Couldn't load data: " + err.message));
}

init();
