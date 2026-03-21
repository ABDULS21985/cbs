import type {
  WealthPlan,
  Advisor,
  AdvisorClient,
  TrustAccount,
  DistributionRecord,
} from '../api/wealthApi';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Create a temporary <a> element pointing at the given blob, click it to
 * trigger a browser download, then clean up.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  // Small delay before cleanup so the browser can start the download
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Wrap an HTML body fragment in a full HTML document with embedded print
 * styles suitable for PDF generation via window.print().
 */
function buildPrintHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
      font-size: 11pt;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 3px solid #1a365d;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 20pt;
      color: #1a365d;
      margin: 0 0 4px 0;
    }
    .header .subtitle {
      font-size: 10pt;
      color: #4a5568;
    }
    h2 {
      font-size: 13pt;
      color: #2d3748;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 20px 0;
      font-size: 10pt;
    }
    th {
      background: #edf2f7;
      color: #2d3748;
      text-align: left;
      padding: 8px 10px;
      font-weight: 600;
      border: 1px solid #cbd5e0;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
    }
    tr:nth-child(even) td {
      background: #f7fafc;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
      margin: 12px 0 20px 0;
    }
    .summary-grid .label {
      font-weight: 600;
      color: #4a5568;
    }
    .summary-grid .value {
      color: #1a1a1a;
    }
    .metrics-row {
      display: flex;
      gap: 32px;
      margin: 12px 0 20px 0;
    }
    .metric-card {
      padding: 10px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      min-width: 140px;
    }
    .metric-card .metric-label {
      font-size: 9pt;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-card .metric-value {
      font-size: 14pt;
      font-weight: 700;
      color: #1a365d;
    }
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #a0aec0;
      text-align: center;
    }
    .legal-notice {
      margin-top: 32px;
      padding: 12px;
      border: 1px solid #e2e8f0;
      background: #f7fafc;
      font-size: 9pt;
      color: #718096;
      font-style: italic;
      text-align: center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Create a hidden iframe, write the given HTML into it, and trigger the
 * browser's print dialog (which allows the user to save as PDF).
 */
function printHtmlToPdf(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to render before triggering print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Remove iframe after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };
}

/**
 * Escape a string value for safe inclusion in a CSV cell.
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 */
function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Public Exports ──────────────────────────────────────────────────────────

/**
 * Generate a PDF report for a single wealth management plan using the
 * browser's print-to-PDF mechanism.
 */
export function exportWealthPlanPdf(plan: WealthPlan): void {
  const generatedDate = formatDate(new Date());

  const goalsRows = (plan.goals ?? plan.financialGoals ?? [])
    .map((g) => {
      const target = Number(g.targetAmount ?? g.target ?? 0);
      const current = Number(g.currentAmount ?? g.current ?? 0);
      const progress = target > 0 ? ((current / target) * 100).toFixed(1) : '0.0';
      return `<tr>
        <td>${g.name ?? g.goalName ?? ''}</td>
        <td style="text-align:right">${formatMoney(target)}</td>
        <td style="text-align:right">${formatMoney(current)}</td>
        <td style="text-align:right">${progress}%</td>
        <td>${formatDate(String(g.targetDate ?? ''))}</td>
        <td>${g.priority ?? 'MEDIUM'}</td>
        <td>${String(g.status ?? 'ON_TRACK').replace(/_/g, ' ')}</td>
      </tr>`;
    })
    .join('');

  const allocRows = (plan.allocations ?? [])
    .map(
      (a) => `<tr>
        <td>${a.assetClass ?? ''}</td>
        <td style="text-align:right">${formatPercent(Number(a.percentage ?? 0))}</td>
        <td style="text-align:right">${formatPercent(Number(a.targetPercentage ?? 0))}</td>
        <td style="text-align:right">${formatMoney(Number(a.currentValue ?? 0))}</td>
      </tr>`
    )
    .join('');

  const bodyHtml = `
    <div class="header">
      <h1>BellBank | Wealth Management</h1>
      <div class="subtitle">Wealth Plan Report</div>
    </div>

    <h2>Plan Summary</h2>
    <div class="summary-grid">
      <span class="label">Plan Code</span><span class="value">${plan.planCode}</span>
      <span class="label">Customer</span><span class="value">${plan.customerName}</span>
      <span class="label">Plan Type</span><span class="value">${plan.planType}</span>
      <span class="label">Status</span><span class="value">${plan.status}</span>
      <span class="label">Advisor</span><span class="value">${plan.advisorName}</span>
      <span class="label">Risk Profile</span><span class="value">${plan.riskProfile}</span>
    </div>

    <h2>Goals</h2>
    <table>
      <thead>
        <tr>
          <th>Goal</th>
          <th style="text-align:right">Target Amount</th>
          <th style="text-align:right">Current Amount</th>
          <th style="text-align:right">Progress</th>
          <th>Target Date</th>
          <th>Priority</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${goalsRows || '<tr><td colspan="7" style="text-align:center;color:#a0aec0">No goals defined</td></tr>'}</tbody>
    </table>

    <h2>Asset Allocation</h2>
    <table>
      <thead>
        <tr>
          <th>Asset Class</th>
          <th style="text-align:right">Current %</th>
          <th style="text-align:right">Target %</th>
          <th style="text-align:right">Current Value</th>
        </tr>
      </thead>
      <tbody>${allocRows || '<tr><td colspan="4" style="text-align:center;color:#a0aec0">No allocation data</td></tr>'}</tbody>
    </table>

    <h2>Performance Metrics</h2>
    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-label">YTD Return</div>
        <div class="metric-value">${formatPercent(plan.ytdReturn ?? 0)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Absolute Gain</div>
        <div class="metric-value">${formatMoney(plan.absoluteGain ?? 0)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Benchmark Diff</div>
        <div class="metric-value">${formatPercent(plan.benchmarkDiff ?? 0)}</div>
      </div>
    </div>

    <div class="footer">
      Generated on ${generatedDate} &mdash; Confidential
    </div>`;

  const html = buildPrintHtml(`Wealth Plan - ${plan.planCode}`, bodyHtml);
  printHtmlToPdf(html);
}

/**
 * Generate a PDF report for an advisor and their client portfolio.
 */
export function exportAdvisorReportPdf(
  advisor: Advisor,
  clients: AdvisorClient[]
): void {
  const generatedDate = formatDate(new Date());

  const clientRows = clients
    .map(
      (c) => `<tr>
        <td>${c.clientName}</td>
        <td>${c.planCode}</td>
        <td style="text-align:right">${formatMoney(c.aum)}</td>
        <td style="text-align:right">${formatPercent(c.ytdReturn)}</td>
        <td>${formatDate(c.lastReviewDate)}</td>
        <td>${c.goalStatus.replace(/_/g, ' ')}</td>
      </tr>`
    )
    .join('');

  const totalAum = clients.reduce((sum, c) => sum + c.aum, 0);

  const bodyHtml = `
    <div class="header">
      <h1>BellBank | Wealth Management</h1>
      <div class="subtitle">Advisor Performance Report</div>
    </div>

    <h2>Advisor Profile</h2>
    <div class="summary-grid">
      <span class="label">Name</span><span class="value">${advisor.name}</span>
      <span class="label">Email</span><span class="value">${advisor.email}</span>
      <span class="label">Phone</span><span class="value">${advisor.phone}</span>
      <span class="label">Specializations</span><span class="value">${(advisor.specializations ?? []).join(', ') || 'N/A'}</span>
      <span class="label">Join Date</span><span class="value">${formatDate(advisor.joinDate)}</span>
      <span class="label">Client Satisfaction</span><span class="value">${advisor.satisfaction != null ? formatPercent(advisor.satisfaction) : 'N/A'}</span>
    </div>

    <h2>Performance Summary</h2>
    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-label">AUM</div>
        <div class="metric-value">${formatMoney(advisor.aum)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Return</div>
        <div class="metric-value">${formatPercent(advisor.avgReturn)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Client Count</div>
        <div class="metric-value">${advisor.clientCount}</div>
      </div>
    </div>

    <h2>Client Portfolio</h2>
    <table>
      <thead>
        <tr>
          <th>Client Name</th>
          <th>Plan Code</th>
          <th style="text-align:right">AUM</th>
          <th style="text-align:right">YTD Return</th>
          <th>Last Review</th>
          <th>Goal Status</th>
        </tr>
      </thead>
      <tbody>${clientRows || '<tr><td colspan="6" style="text-align:center;color:#a0aec0">No clients assigned</td></tr>'}</tbody>
    </table>

    <div style="margin-top:16px;">
      <strong>Total Client AUM:</strong> ${formatMoney(totalAum)}
    </div>

    <div class="footer">
      Generated on ${generatedDate} &mdash; Confidential
    </div>`;

  const html = buildPrintHtml(`Advisor Report - ${advisor.name}`, bodyHtml);
  printHtmlToPdf(html);
}

/**
 * Generate a formal trust statement PDF with legal-document styling.
 */
export function exportTrustStatementPdf(
  trust: TrustAccount,
  distributions: DistributionRecord[]
): void {
  const generatedDate = formatDate(new Date());

  const beneficiaryRows = (trust.beneficiaries ?? [])
    .map(
      (b) => `<tr>
        <td>${b.name}</td>
        <td>${b.relationship}</td>
        <td style="text-align:right">${formatPercent(b.sharePercent)}</td>
      </tr>`
    )
    .join('');

  const distributionRows = distributions
    .map(
      (d) => `<tr>
        <td>${formatDate(d.date)}</td>
        <td style="text-align:right">${formatMoney(d.amount)}</td>
        <td>${d.beneficiary}</td>
        <td>${d.type}</td>
        <td>${d.approvedBy}</td>
      </tr>`
    )
    .join('');

  // Estimate an annual fee as 1% of corpus (typical trust fee)
  const annualFee = trust.corpusValue * 0.01;

  const bodyHtml = `
    <div class="header">
      <h1>BellBank | Trust Services</h1>
      <div class="subtitle">Trust Account Statement</div>
    </div>

    <h2>Trust Information</h2>
    <div class="summary-grid">
      <span class="label">Trust Name</span><span class="value">${trust.trustName}</span>
      <span class="label">Trust Code</span><span class="value">${trust.trustCode}</span>
      <span class="label">Trust Type</span><span class="value">${trust.trustType}</span>
      <span class="label">Inception Date</span><span class="value">${formatDate(trust.inceptionDate)}</span>
    </div>

    <h2>Trust Details</h2>
    <div class="summary-grid">
      <span class="label">Trustee</span><span class="value">${trust.trusteeName} (${trust.trusteeType})</span>
      <span class="label">Grantor</span><span class="value">${`Customer #${trust.grantorCustomerId}`}</span>
      <span class="label">Corpus Value</span><span class="value">${formatMoney(trust.corpusValue, trust.currency)}</span>
      <span class="label">Income YTD</span><span class="value">${formatMoney(trust.incomeYtd, trust.currency)}</span>
      <span class="label">Annual Fee (est.)</span><span class="value">${formatMoney(annualFee, trust.currency)}</span>
      <span class="label">Status</span><span class="value">${trust.status}</span>
    </div>

    <h2>Beneficiaries</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Relationship</th>
          <th style="text-align:right">Allocation %</th>
        </tr>
      </thead>
      <tbody>${beneficiaryRows || '<tr><td colspan="3" style="text-align:center;color:#a0aec0">No beneficiaries on record</td></tr>'}</tbody>
    </table>

    <h2>Distribution History</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th style="text-align:right">Amount</th>
          <th>Beneficiary</th>
          <th>Type</th>
          <th>Approved By</th>
        </tr>
      </thead>
      <tbody>${distributionRows || '<tr><td colspan="5" style="text-align:center;color:#a0aec0">No distributions recorded</td></tr>'}</tbody>
    </table>

    <div class="legal-notice">
      This statement is for informational purposes only. It does not constitute
      legal, tax, or investment advice. Please consult your legal counsel for
      questions regarding trust administration.
    </div>

    <div class="footer">
      Generated on ${generatedDate} &mdash; Confidential
    </div>`;

  const html = buildPrintHtml(
    `Trust Statement - ${trust.trustCode}`,
    bodyHtml
  );
  printHtmlToPdf(html);
}

/**
 * Generate a multi-section CSV (AUM report) covering plans, advisors, and
 * trusts, then trigger a browser download.
 */
export function exportAumReportExcel(
  plans: WealthPlan[],
  advisors: Advisor[],
  trusts: TrustAccount[]
): void {
  const rows: string[] = [];

  const totalPlanAum = plans.reduce(
    (sum, p) => sum + p.totalInvestableAssets,
    0
  );
  const totalTrustCorpus = trusts.reduce((sum, t) => sum + t.corpusValue, 0);
  const totalAum = totalPlanAum + totalTrustCorpus;

  // ── Section 1: Summary ──
  rows.push('=== SUMMARY ===');
  rows.push('Metric,Value');
  rows.push(`Total AUM,${totalAum.toFixed(2)}`);
  rows.push(`Plan Count,${plans.length}`);
  rows.push(`Advisor Count,${advisors.length}`);
  rows.push(`Trust Count,${trusts.length}`);
  rows.push('');

  // ── Section 2: Plans Detail ──
  rows.push('=== PLANS DETAIL ===');
  rows.push(
    'Plan Code,Customer Name,Plan Type,Status,Advisor,Risk Profile,Net Worth,Investable Assets,Annual Income,YTD Return,Absolute Gain,Benchmark Diff,Next Review Date'
  );
  for (const p of plans) {
    rows.push(
      [
        escapeCsvValue(p.planCode),
        escapeCsvValue(p.customerName),
        escapeCsvValue(p.planType),
        escapeCsvValue(p.status),
        escapeCsvValue(p.advisorName),
        escapeCsvValue(p.riskProfile),
        p.totalNetWorth.toFixed(2),
        p.totalInvestableAssets.toFixed(2),
        p.annualIncome.toFixed(2),
        (p.ytdReturn ?? 0).toFixed(2),
        (p.absoluteGain ?? 0).toFixed(2),
        (p.benchmarkDiff ?? 0).toFixed(2),
        escapeCsvValue(p.nextReviewDate ?? ''),
      ].join(',')
    );
  }
  rows.push('');

  // ── Section 3: Advisor Breakdown ──
  rows.push('=== ADVISOR BREAKDOWN ===');
  rows.push(
    'Advisor Name,Email,Status,Client Count,AUM,Avg Return,Revenue,Satisfaction,Join Date,Specializations'
  );
  for (const a of advisors) {
    rows.push(
      [
        escapeCsvValue(a.name),
        escapeCsvValue(a.email),
        escapeCsvValue(a.status),
        a.clientCount,
        a.aum.toFixed(2),
        a.avgReturn.toFixed(2),
        a.revenue.toFixed(2),
        a.satisfaction.toFixed(2),
        escapeCsvValue(a.joinDate),
        escapeCsvValue((a.specializations ?? []).join('; ')),
      ].join(',')
    );
  }
  rows.push('');

  // ── Section 4: Trust Summary ──
  rows.push('=== TRUST SUMMARY ===');
  rows.push(
    'Trust Code,Trust Name,Trust Type,Grantor,Trustee,Corpus Value,Income YTD,Distributions YTD,Currency,Inception Date,Status,Beneficiary Count'
  );
  for (const t of trusts) {
    rows.push(
      [
        escapeCsvValue(t.trustCode),
        escapeCsvValue(t.trustName),
        escapeCsvValue(t.trustType),
        escapeCsvValue(t.grantorName),
        escapeCsvValue(t.trusteeName),
        t.corpusValue.toFixed(2),
        t.incomeYtd.toFixed(2),
        t.distributionsYtd.toFixed(2),
        escapeCsvValue(t.currency),
        escapeCsvValue(t.inceptionDate),
        escapeCsvValue(t.status),
        (t.beneficiaries ?? []).length,
      ].join(',')
    );
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const timestamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `AUM_Report_${timestamp}.csv`);
}

/**
 * Generic CSV export for any analytics data set. Columns are auto-detected
 * from the keys of the first record. Numbers and ISO date strings are
 * formatted for readability.
 */
export function exportAnalyticsCsv(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (data.length === 0) return;

  const columns = Object.keys(data[0]);
  const rows: string[] = [];

  // Header row
  rows.push(columns.map(escapeCsvValue).join(','));

  // Data rows
  for (const record of data) {
    const cells = columns.map((col) => {
      const val = record[col];

      if (val == null) return '';

      // Format numbers with two decimal places
      if (typeof val === 'number') {
        return val.toFixed(2);
      }

      // Format ISO date strings (e.g. "2025-06-15T10:30:00Z" or "2025-06-15")
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        try {
          return escapeCsvValue(formatDate(val));
        } catch {
          return escapeCsvValue(val);
        }
      }

      return escapeCsvValue(val);
    });
    rows.push(cells.join(','));
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // Ensure filename ends with .csv
  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  triggerDownload(blob, safeName);
}
