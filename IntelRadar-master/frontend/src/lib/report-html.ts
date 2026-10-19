import { METRICS, formatScannedAt, type Competitor } from "./dashboard";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/[&<>"']/g, (char) => ESCAPES[char])
    .trim();

const safeUrl = (url?: string): string =>
  url && /^https?:\/\//i.test(url) ? esc(url) : "#";

const NONE = "—";

const THREAT_COLOR: Record<string, string> = {
  CRITICAL: "#c93e25",
  HIGH: "#a9650f",
  MODERATE: "#3b78a8",
  LOW: "#1e8a58",
};

const bulletList = (items?: string[], empty = "None recorded") =>
  items?.length
    ? `<ul class="bullets">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
    : `<p class="muted">${esc(empty)}</p>`;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "competitor";

/**
 * A self-contained, print-optimised HTML document. Opened in a new window and
 * sent straight to the browser's print dialog, where the user saves it as PDF.
 * No external fonts, images or scripts, so it works offline.
 */
export function competitorToPrintHtml(competitor: Competitor): string {
  const c = competitor;
  const metrics = METRICS.map((metric) => ({
    label: metric.label,
    value: c.radar_metrics?.[metric.key],
  })).filter((row): row is { label: string; value: number } => typeof row.value === "number");

  const threat = (c.threat_level || "LOW").toUpperCase();
  const threatColor = THREAT_COLOR[threat] ?? THREAT_COLOR.LOW;
  const generated = new Date().toISOString().slice(0, 10);

  const tierCount = c.pricing_tiers?.length ?? 0;
  const tierColumns = tierCount === 4 ? 2 : Math.min(3, Math.max(1, tierCount));

  const pricing = tierCount
    ? `<div class="tiers" style="grid-template-columns:repeat(${tierColumns}, 1fr)">${c.pricing_tiers
        .map(
          (tier) => `<div class="tier">
            <div class="tier-head">
              <strong>${esc(tier.plan)}</strong>
              <span class="price">${esc(tier.price)}${
                tier.billing_period ? ` <small>/ ${esc(tier.billing_period)}</small>` : ""
              }</span>
            </div>
            ${
              tier.highlights?.length
                ? `<ul class="bullets tight">${tier.highlights
                    .map((item) => `<li>${esc(item)}</li>`)
                    .join("")}</ul>`
                : `<p class="muted small">No inclusions listed.</p>`
            }
          </div>`
        )
        .join("")}</div>`
    : `<p class="muted">No pricing data recorded.</p>`;

  const features = c.key_features?.length
    ? `<table class="table">
        <thead><tr><th>Feature</th><th>Category</th><th>Maturity</th><th>Why it matters</th></tr></thead>
        <tbody>${c.key_features
          .map(
            (feature) => `<tr>
              <td><strong>${esc(feature.feature)}</strong></td>
              <td>${esc(feature.category)}</td>
              <td>${esc(feature.maturity)}</td>
              <td>${esc(feature.strategic_edge)}</td>
            </tr>`
          )
          .join("")}</tbody>
      </table>`
    : `<p class="muted">No features recorded.</p>`;

  const swot = c.swot_analysis;
  const swotSections: { title: string; key: keyof NonNullable<Competitor["swot_analysis"]>; color: string }[] = [
    { title: "Strengths", key: "strengths", color: "#1e8a58" },
    { title: "Weaknesses", key: "weaknesses", color: "#a9650f" },
    { title: "Opportunities", key: "opportunities", color: "#3b78a8" },
    { title: "Threats", key: "threats", color: "#c93e25" },
  ];
  const swotHtml = swot
    ? `<div class="swot">${swotSections
        .map(
          (section) => `<div class="swot-cell" style="border-top-color:${section.color}">
            <h3>${section.title}</h3>
            ${bulletList(swot[section.key])}
          </div>`
        )
        .join("")}</div>`
    : `<p class="muted">No SWOT recorded.</p>`;

  const complaints = c.customer_complaints?.length
    ? `<ul class="list">${c.customer_complaints
        .map(
          (item) => `<li>
            <span class="tag">${esc(item.severity)}</span>
            <span>${esc(item.issue)}</span>
            ${item.source ? `<span class="muted small"> · ${esc(item.source)}</span>` : ""}
          </li>`
        )
        .join("")}</ul>`
    : `<p class="muted">No complaints recorded.</p>`;

  const news = c.recent_news?.length
    ? `<ul class="list">${c.recent_news
        .map(
          (item) => `<li>
            <a href="${safeUrl(item.url)}">${esc(item.title)}</a>
            <span class="muted small">${[item.source, item.published].filter(Boolean).map(esc).join(" · ")}</span>
          </li>`
        )
        .join("")}</ul>`
    : `<p class="muted">No recent news recorded.</p>`;

  const moves = c.recent_movements?.length
    ? `<ul class="list">${c.recent_movements
        .map(
          (move) => `<li>
            <span class="muted small">${[move.date, move.type].filter(Boolean).map(esc).join(" · ")}</span>
            <strong>${esc(move.headline)}</strong>
            <span>${esc(move.impact)}</span>
          </li>`
        )
        .join("")}</ul>`
    : `<p class="muted">No recent moves recorded.</p>`;

  const changes = c.changes?.length
    ? `<ul class="list">${c.changes
        .map(
          (change) => `<li>
            <span class="tag">${esc(change.severity)}</span>
            <span>${esc(change.summary)}</span>
          </li>`
        )
        .join("")}</ul>`
    : `<p class="muted">No changes since the previous scan.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.competitor_name)} — IntelRadar report</title>
<style>
  :root {
    --ink: #14303a;
    --primary: #1f7a70;
    --muted: #4f6870;
    --line: #d6e2e3;
    --wash: #f1f6f6;
    --saffron: #e0a02f;
    --coral: #e76f51;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--ink);
    font-size: 10.5pt;
    line-height: 1.5;
    background: #fff;
  }
  main { max-width: 186mm; margin: 0 auto; padding: 12mm 0 16mm; }
  @page { size: A4; margin: 14mm 14mm 16mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    main { padding: 0; max-width: none; }
    .no-print { display: none !important; }
  }

  .cover { border-bottom: 3px solid var(--primary); padding-bottom: 8mm; margin-bottom: 8mm; }
  .eyebrow {
    display: flex; align-items: center; gap: 6px;
    font-size: 8.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--primary);
  }
  .eyebrow::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--primary); }
  h1 { font-size: 30pt; line-height: 1.05; letter-spacing: -0.03em; margin: 10px 0 6px; }
  .tagline { color: var(--muted); font-size: 12.5pt; margin: 0 0 10px; max-width: 60ch; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .pill {
    border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px;
    font-size: 8.5pt; font-weight: 600; color: var(--muted); background: var(--wash);
  }
  .threat {
    border-radius: 999px; padding: 2px 9px; font-size: 8.5pt; font-weight: 700;
    color: #fff; background: ${threatColor};
  }
  .muted { color: var(--muted); }
  .small { font-size: 8.5pt; }
  .muted.small { margin-left: 6px; font-weight: 400; }

  h2 {
    font-size: 9.5pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
    color: var(--muted); margin: 9mm 0 3mm; padding-bottom: 2mm;
    border-bottom: 1px solid var(--line); break-after: avoid;
  }
  h3 { font-size: 10.5pt; margin: 0 0 2mm; break-after: avoid; }
  p { margin: 0 0 2.5mm; }

  .bullets { margin: 0; padding-left: 5mm; }
  .bullets li { margin: 1.2mm 0; break-inside: avoid; }
  .bullets.tight li { margin: 0.8mm 0; }

  .scorecard { display: flex; flex-wrap: wrap; gap: 6mm; align-items: center; break-inside: avoid; }
  .dial {
    width: 34mm; height: 34mm; border-radius: 50%; flex-shrink: 0;
    padding: 2.4mm; background: #e6eeee;
  }
  .dial-inner {
    width: 100%; height: 100%; border-radius: 50%; background: #fff;
    display: grid; place-items: center; text-align: center;
  }
  .dial strong { display: block; font-size: 22pt; line-height: 1; color: ${threatColor}; }
  .dial span { font-size: 7.5pt; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .metrics { flex: 1; min-width: 90mm; }
  .metric { display: grid; grid-template-columns: 32mm 1fr 10mm; gap: 4mm; align-items: center; margin: 2mm 0; }
  .metric span { font-weight: 600; }
  .metric .bar { height: 2.6mm; border-radius: 99px; background: var(--wash); overflow: hidden; }
  .metric .bar i { display: block; height: 100%; border-radius: 99px; background: var(--primary); }
  .metric b { text-align: right; font-variant-numeric: tabular-nums; }

  .tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
  .tier {
    border: 1px solid var(--line); border-radius: 3mm; padding: 4mm;
    break-inside: avoid;
  }
  .tier-head { display: flex; flex-direction: column; gap: 1mm; margin-bottom: 2.5mm; }
  .tier-head strong { font-size: 10pt; }
  .price { font-size: 13pt; font-weight: 800; color: var(--primary); }
  .price small { font-size: 8pt; font-weight: 500; color: var(--muted); }
  .tier .bullets { font-size: 9pt; }

  .table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .table th {
    text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .06em;
    color: var(--muted); border-bottom: 1px solid var(--line); padding: 2mm; background: var(--wash);
  }
  .table td { border-bottom: 1px solid var(--line); padding: 2.2mm; vertical-align: top; }
  .table tr { break-inside: avoid; }

  .swot { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
  .swot-cell {
    border: 1px solid var(--line); border-top: 2.5px solid var(--primary);
    border-radius: 2.5mm; padding: 4mm; break-inside: avoid;
  }
  .swot-cell h3 { font-size: 9.5pt; text-transform: uppercase; letter-spacing: .06em; }
  .swot-cell .bullets { font-size: 9pt; }

  ul.list { list-style: none; margin: 0; padding: 0; }
  ul.list li {
    padding: 2.2mm 0; border-bottom: 1px solid var(--line);
    display: flex; flex-wrap: wrap; gap: 2mm; align-items: baseline;
    break-inside: avoid;
  }
  ul.list li a { color: var(--primary); text-decoration: none; font-weight: 600; }
  .tag {
    font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    border: 1px solid var(--line); border-radius: 999px; padding: 0.5mm 2mm; color: var(--muted);
  }

  footer {
    margin-top: 12mm; padding-top: 4mm; border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; gap: 6mm;
    font-size: 7.5pt; color: var(--muted);
  }
  .toolbar { position: fixed; top: 14px; right: 14px; display: flex; gap: 8px; }
  .toolbar button {
    font: inherit; font-size: 12px; font-weight: 600; color: #fff; background: var(--primary);
    border: 0; border-radius: 999px; padding: 8px 16px; cursor: pointer;
  }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">Save as PDF</button>
  </div>
  <main>
    <header class="cover">
      <div class="eyebrow">Competitive intelligence · IntelRadar</div>
      <h1>${esc(c.competitor_name)}</h1>
      ${c.tagline ? `<p class="tagline">${esc(c.tagline)}</p>` : ""}
      <div class="meta">
        ${c.category ? `<span class="pill">${esc(c.category)}</span>` : ""}
        ${c.segment ? `<span class="pill">${esc(c.segment)}</span>` : ""}
        <span class="threat">${esc(threat)} · ${esc(c.threat_score ?? NONE)}/100</span>
        <span class="muted small">Last scanned ${esc(formatScannedAt(c.last_scanned_at))}</span>
      </div>
    </header>

    <h2>Strategic brief</h2>
    <p>${esc(c.strategic_summary || "No summary recorded.")}</p>

    <h2>Where to compete</h2>
    ${bulletList(c.vulnerabilities_to_exploit)}

    ${
      metrics.length
        ? `<h2>Threat signals</h2>
          <div class="scorecard">
            <div class="dial" style="background:conic-gradient(from -90deg, ${threatColor} ${
              Math.max(0, Math.min(100, c.threat_score ?? 0)) * 3.6
            }deg, #e6eeee 0)">
              <div class="dial-inner">
                <div><strong>${esc(c.threat_score ?? NONE)}</strong><span>out of 100</span></div>
              </div>
            </div>
            <div class="metrics">
              ${metrics
                .map(
                  (metric) => `<div class="metric">
                    <span>${esc(metric.label)}</span>
                    <div class="bar"><i style="width:${Math.max(0, Math.min(100, metric.value))}%"></i></div>
                    <b>${metric.value}</b>
                  </div>`
                )
                .join("")}
            </div>
          </div>`
        : ""
    }

    <h2>Pricing</h2>
    ${pricing}

    <h2>Key features</h2>
    ${features}

    <h2>SWOT</h2>
    ${swotHtml}

    <h2>Customer complaints</h2>
    ${complaints}

    <h2>Recent signals</h2>
    ${news}

    <h2>Recent moves</h2>
    ${moves}

    <h2>Changes since last scan</h2>
    ${changes}

    <footer>
      <span>Generated by IntelRadar · ${generated}</span>
      <span>${esc(c.competitor_name)} · competitive intelligence report</span>
    </footer>
  </main>
</body>
</html>`;
}

function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Open the print-ready report and trigger the browser's print dialog (the user
 * chooses "Save as PDF"). Falls back to downloading the HTML if popups are
 * blocked. Returns how the export was delivered.
 */
export function exportReportPdf(competitor: Competitor): "print" | "download" {
  const html = competitorToPrintHtml(competitor);

  const win = window.open("", "_blank");
  if (!win) {
    downloadHtml(html, `${slugify(competitor.competitor_name)}-intelradar-report.html`);
    return "download";
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  try {
    win.opener = null;
  } catch {
    /* older browsers */
  }

  // Let the document lay out before showing the print dialog.
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* the user can still press the on-page button */
    }
  }, 350);

  return "print";
}
