import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  dark:      [15,  17,  23],   // #0f1117
  card:      [22,  27,  39],   // #161b27
  accent:    [108, 92,  231],  // #6c5ce7
  green:     [0,   184, 148],  // #00b894
  amber:     [253, 203, 110],  // #fdcb6e
  red:       [214, 48,  49],   // #d63031
  textLight: [240, 241, 245],  // #f0f1f5
  textMuted: [136, 146, 164],  // #8892a4
  critical:  [255, 71,  87],
  high:      [255, 165, 2],
  medium:    [30,  144, 255],
  info:      [162, 155, 254],
  pass:      [0,   184, 148],
};

const severityColor = (sev) => ({
  CRITICAL: COLORS.critical,
  HIGH:     COLORS.high,
  MEDIUM:   COLORS.medium,
  INFO:     COLORS.info,
  PASS:     COLORS.pass,
}[sev] || COLORS.textMuted);

export function generatePDFReport(results) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const now = new Date();

  const { final, scores, findings, _target } = results;
  const issues = findings.filter(f => f.severity !== 'PASS');
  const passes = findings.filter(f => f.severity === 'PASS');

  // ── helper: filled rect ──────────────────────────────────────
  const rect = (x, y, w, h, color) => {
    doc.setFillColor(...color);
    doc.rect(x, y, w, h, 'F');
  };

  // ── helper: text ────────────────────────────────────────────
  const text = (str, x, y, { size=10, color=COLORS.textLight, bold=false, align='left' } = {}) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(str, x, y, { align });
  };

  // ══════════════════════════════════════════════════════════════
  // PAGE 1 — Cover
  // ══════════════════════════════════════════════════════════════
  rect(0, 0, W, H, COLORS.dark);

  // Top accent bar
  rect(0, 0, W, 2, COLORS.accent);

  // Header block
  rect(0, 2, W, 55, COLORS.card);

  // Logo area
  rect(14, 12, 8, 8, COLORS.accent);
  text('SP', 18, 18, { size: 7, bold: true, align: 'center' });
  text('SecurePulse', 26, 18, { size: 13, bold: true });
  text('Security Intelligence Platform', 26, 23, { size: 8, color: COLORS.textMuted });

  // Title
  text('SECURITY SCAN REPORT', W / 2, 38, { size: 20, bold: true, align: 'center' });
  text('Comprehensive Vulnerability Assessment', W / 2, 45, { size: 9, color: COLORS.textMuted, align: 'center' });
  text(`Generated: ${now.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })} at ${now.toLocaleTimeString()}`, W / 2, 52, { size: 8, color: COLORS.textMuted, align: 'center' });

  // Score ring area (simulated with circles)
  const cx = W / 2, cy = 105, outerR = 28, innerR = 22;
  const scoreColor = final.score >= 75 ? COLORS.green : final.score >= 50 ? COLORS.amber : COLORS.red;

  // Outer ring background
  doc.setDrawColor(...COLORS.card);
  doc.setLineWidth(4);
  doc.circle(cx, cy, outerR, 'S');

  // Score arc (approximated with colored circle overlay)
  doc.setDrawColor(...scoreColor);
  doc.setLineWidth(4);
  // Draw partial arc using lines (jsPDF doesn't support arcs natively well)
  const totalAngle = (final.score / 100) * 360;
  const steps = Math.floor(totalAngle / 3);
  for (let i = 0; i < steps; i++) {
    const angle = (i * 3 - 90) * (Math.PI / 180);
    const nextAngle = ((i * 3 + 3) - 90) * (Math.PI / 180);
    doc.line(
      cx + outerR * Math.cos(angle),
      cy + outerR * Math.sin(angle),
      cx + outerR * Math.cos(nextAngle),
      cy + outerR * Math.sin(nextAngle)
    );
  }

  // Inner fill to create ring effect
  doc.setFillColor(...COLORS.dark);
  doc.circle(cx, cy, innerR, 'F');

  // Score text in center
  text(String(final.score), cx, cy + 2, { size: 20, bold: true, align: 'center' });
  text('/100', cx, cy + 8, { size: 8, color: scoreColor, align: 'center' });

  // Grade badge
  rect(cx - 12, cy + 14, 24, 10, COLORS.card);
  text(`Grade: ${final.grade}`, cx, cy + 21, { size: 9, bold: true, color: scoreColor, align: 'center' });

  // Label
  text('SECURITY INTEGRITY SCORE', cx, cy - 34, { size: 8, color: COLORS.textMuted, bold: true, align: 'center' });

  // Target info box
  rect(14, 140, W - 28, 28, COLORS.card);
  text('SCAN TARGET', 20, 149, { size: 7, color: COLORS.textMuted, bold: true });
  text(_target || 'Unknown Target', 20, 156, { size: 11, bold: true });
  text('SCAN DATE', W - 14, 149, { size: 7, color: COLORS.textMuted, bold: true, align: 'right' });
  text(now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), W - 14, 156, { size: 11, bold: true, align: 'right' });

  // Summary stats row
  const stats = [
    { label: 'ISSUES FOUND', value: String(issues.length),  color: issues.length > 0 ? COLORS.red : COLORS.green },
    { label: 'PASSING CHECKS', value: String(passes.length), color: COLORS.green },
    { label: 'CRITICAL', value: String(findings.filter(f=>f.severity==='CRITICAL').length), color: COLORS.critical },
    { label: 'HIGH', value: String(findings.filter(f=>f.severity==='HIGH').length), color: COLORS.high },
  ];

  stats.forEach(({ label, value, color }, i) => {
    const x = 14 + i * ((W - 28) / 4);
    const bw = (W - 28) / 4 - 4;
    rect(x, 176, bw, 20, COLORS.card);
    text(value, x + bw / 2, 186, { size: 16, bold: true, color, align: 'center' });
    text(label, x + bw / 2, 192, { size: 6, color: COLORS.textMuted, align: 'center' });
  });

  // Overall message
  rect(14, 204, W - 28, 16, [20, 25, 38]);
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.5);
  doc.rect(14, 204, W - 28, 16, 'S');
  text(final.message || 'Scan complete.', W / 2, 214, { size: 9, color: COLORS.textLight, align: 'center' });

  // Footer
  rect(0, H - 12, W, 12, COLORS.card);
  text('CONFIDENTIAL — SecurePulse Security Report', W / 2, H - 5, { size: 7, color: COLORS.textMuted, align: 'center' });
  text('Page 1', W - 14, H - 5, { size: 7, color: COLORS.textMuted, align: 'right' });

  // ══════════════════════════════════════════════════════════════
  // PAGE 2 — Issues
  // ══════════════════════════════════════════════════════════════
  doc.addPage();
  rect(0, 0, W, H, COLORS.dark);
  rect(0, 0, W, 2, COLORS.accent);
  rect(0, 2, W, 20, COLORS.card);
  text('SecurePulse', 14, 13, { size: 10, bold: true });
  text('Issues & Vulnerabilities', W / 2, 13, { size: 12, bold: true, align: 'center' });
  text(`Page 2`, W - 14, 13, { size: 8, color: COLORS.textMuted, align: 'right' });

  if (issues.length === 0) {
    text('✓ No issues detected. All checks passed.', W / 2, 80, { size: 14, color: COLORS.green, bold: true, align: 'center' });
  } else {
    autoTable(doc, {
      startY: 28,
      head: [['Severity', 'Title', 'Surface', 'Recommended Fix']],
      body: issues.map(f => [f.severity, f.title, f.surface, f.fix || 'Review manually']),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: COLORS.textLight,
        fillColor: COLORS.dark,
        lineColor: [30, 37, 53],
        lineWidth: 0.3,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.card,
        textColor: COLORS.textMuted,
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [18, 22, 34],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 65 },
        2: { cellWidth: 28 },
        3: { cellWidth: 65 },
      },
      didParseCell(data) {
        if (data.column.index === 0 && data.section === 'body') {
          data.cell.styles.textColor = severityColor(data.cell.raw);
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  // Footer
  rect(0, H - 12, W, 12, COLORS.card);
  text('CONFIDENTIAL — SecurePulse Security Report', W / 2, H - 5, { size: 7, color: COLORS.textMuted, align: 'center' });

  // ══════════════════════════════════════════════════════════════
  // PAGE 3 — Passing Checks + Surface Scores
  // ══════════════════════════════════════════════════════════════
  doc.addPage();
  rect(0, 0, W, H, COLORS.dark);
  rect(0, 0, W, 2, COLORS.accent);
  rect(0, 2, W, 20, COLORS.card);
  text('SecurePulse', 14, 13, { size: 10, bold: true });
  text('Passing Checks & Surface Scores', W / 2, 13, { size: 12, bold: true, align: 'center' });
  text('Page 3', W - 14, 13, { size: 8, color: COLORS.textMuted, align: 'right' });

  // Surface scores
  rect(14, 26, W - 28, 8, COLORS.card);
  text('SURFACE SCORES', 20, 31.5, { size: 7, color: COLORS.textMuted, bold: true });

  const surfaces = [
    { label: 'Website Security', score: scores.website, color: COLORS.accent },
    { label: 'Application Logic', score: scores.app, color: [108, 92, 231] },
    { label: 'Codebase Integrity', score: scores.codebase, color: [0, 206, 201] },
  ];

  surfaces.forEach(({ label, score, color }, i) => {
    if (score === null || score === undefined) return;
    const y = 40 + i * 14;
    text(label, 20, y + 4, { size: 8 });
    // Bar background
    rect(75, y, 100, 5, COLORS.card);
    // Bar fill
    rect(75, y, score, 5, color);
    text(`${score}/100`, W - 14, y + 4, { size: 8, bold: true, align: 'right' });
  });

  // Passing checks table
  const passY = 40 + surfaces.filter(s => s.score !== null && s.score !== undefined).length * 14 + 10;

  rect(14, passY, W - 28, 8, COLORS.card);
  text('PASSING CHECKS', 20, passY + 5.5, { size: 7, color: COLORS.textMuted, bold: true });

  if (passes.length === 0) {
    text('No passing checks recorded.', 20, passY + 20, { size: 9, color: COLORS.textMuted });
  } else {
    autoTable(doc, {
      startY: passY + 10,
      head: [['Check', 'Surface', 'Notes']],
      body: passes.map(f => [f.title, f.surface || '—', f.fix || 'All clear']),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: COLORS.textLight,
        fillColor: COLORS.dark,
        lineColor: [30, 37, 53],
        lineWidth: 0.3,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.card,
        textColor: COLORS.textMuted,
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [18, 22, 34] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 35 },
        2: { cellWidth: 55 },
      },
      didParseCell(data) {
        if (data.column.index === 0 && data.section === 'body') {
          data.cell.styles.textColor = COLORS.pass;
        }
      },
    });
  }

  // Footer
  rect(0, H - 12, W, 12, COLORS.card);
  text('CONFIDENTIAL — SecurePulse Security Report', W / 2, H - 5, { size: 7, color: COLORS.textMuted, align: 'center' });
  text(`Generated by SecurePulse · ${now.toLocaleDateString()}`, 14, H - 5, { size: 7, color: COLORS.textMuted });

  // ── Save ────────────────────────────────────────────────────
  const filename = `securepulse-report-${(_target || 'scan').replace(/[^a-z0-9]/gi, '-')}-${now.toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
}
