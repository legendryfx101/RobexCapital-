import { jsPDF } from 'jspdf';
import type { ForexAnalysisRecord } from '../firebase';

export interface PDFExportOptions {
  analysis: ForexAnalysisRecord;
  accountBalance?: number;
  riskPercent?: number;
  leverage?: number;
  lotSize?: number;
  marginRequired?: number;
  sentiment?: {
    label: string;
    score: number;
    bullPercentage: number;
    bearPercentage: number;
  };
}

export function exportSignalToPDF({
  analysis,
  accountBalance,
  riskPercent,
  leverage,
  lotSize,
  marginRequired,
  sentiment,
}: PDFExportOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // 1. Dark Theme Header
  doc.setFillColor(10, 10, 12);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header Bar
  doc.setFillColor(18, 18, 22);
  doc.roundedRect(margin, margin, contentWidth, 24, 3, 3, 'F');

  // Gold accent bar
  doc.setFillColor(217, 119, 6);
  doc.rect(margin, margin, 4, 24, 'F');

  // Logo & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('RobexCapital', margin + 8, margin + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(161, 161, 170);
  doc.text('AI Institutional RobexCapital Signal & Technical Briefing', margin + 8, margin + 16);

  // Timestamp
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  const dateStr = analysis.createdAt
    ? new Date(analysis.createdAt).toLocaleString()
    : new Date().toLocaleString();
  doc.text(dateStr, pageWidth - margin - 6, margin + 14, { align: 'right' });

  let y = margin + 30;

  // 2. Primary Signal Badge Banner
  const isBuy = analysis.signal === 'BUY';
  const isSell = analysis.signal === 'SELL';
  const signalColor = isBuy
    ? [16, 185, 129] // Emerald green
    : isSell
    ? [239, 68, 68] // Red
    : [113, 113, 122]; // Gray

  doc.setFillColor(24, 24, 27);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

  // Signal Tag Box
  doc.setFillColor(signalColor[0], signalColor[1], signalColor[2]);
  doc.roundedRect(margin + 4, y + 3, 26, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(analysis.signal, margin + 17, y + 13.5, { align: 'center' });

  // Pair & Timeframe
  doc.setFontSize(14);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(analysis.pair, margin + 34, y + 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(161, 161, 170);
  doc.text(
    `Timeframe: ${analysis.timeframe || 'H1'}   |   Analysis: ${analysis.analysis_type || 'Technical'}`,
    margin + 34,
    y + 16
  );

  // Confidence Pill on Right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11);
  doc.text(`Confidence: ${analysis.confidence}`, pageWidth - margin - 6, y + 13, {
    align: 'right',
  });

  y += 28;

  // 3. Execution Levels Grid (Entry, Stop Loss, Single Take Profit, R:R Payoff)
  doc.setFillColor(18, 18, 22);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11);
  doc.text('TRADE EXECUTION TARGETS & RISK SPECIFICATIONS', margin + 6, y + 7);

  const entryNum = parseFloat(analysis.entry_price?.replace(/[^0-9.]/g, '') || '0');
  const slNum = parseFloat(analysis.stop_loss?.replace(/[^0-9.]/g, '') || '0');
  const tp1Num = parseFloat((analysis.take_profit_1 || '').replace(/[^0-9.]/g, '') || '0');
  const riskDist = Math.abs(entryNum - slNum);
  const rewardDist = Math.abs(tp1Num - entryNum);
  const rrRatio = riskDist > 0 && rewardDist > 0 ? (rewardDist / riskDist).toFixed(1) : (analysis.risk_reward_ratio?.replace('1:', '') || '2.5');

  const levelData = [
    { label: 'Order Type', val: analysis.order_type || 'Market Exec', color: [245, 158, 11] },
    { label: 'Entry Price', val: analysis.entry_price || '--', color: [255, 255, 255] },
    { label: 'Stop Loss', val: analysis.stop_loss || '--', color: [248, 113, 113] },
    { label: 'TP1 (50%)', val: analysis.take_profit_1 || '--', color: [52, 211, 153] },
    { label: 'TP2 (30%)', val: analysis.take_profit_2 || '--', color: [110, 231, 183] },
    { label: 'Payoff (R:R)', val: `1:${rrRatio} R`, color: [245, 158, 11] },
  ];

  const colWidth = contentWidth / levelData.length;

  levelData.forEach((item, idx) => {
    const colX = margin + idx * colWidth + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text(item.label, colX, y + 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.val, colX, y + 26);
  });

  y += 44;

  // 4. Optional Position Sizing & Leverage Parameters
  if (accountBalance && riskPercent && leverage) {
    doc.setFillColor(24, 24, 27);
    doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(245, 158, 11);
    doc.text('POSITION SIZING & LEVERAGE SPECIFICATIONS', margin + 6, y + 6);

    const calcCols = [
      { label: 'Account Balance', val: `$${accountBalance.toLocaleString()}` },
      { label: 'Risk % Per Trade', val: `${riskPercent}%` },
      { label: 'Account Leverage', val: `1:${leverage}` },
      { label: 'Recommended Lots', val: lotSize ? `${lotSize} Lots` : '--' },
      { label: 'Margin Required', val: marginRequired ? `$${marginRequired.toFixed(2)}` : '--' },
    ];

    const cWidth = contentWidth / calcCols.length;
    calcCols.forEach((c, idx) => {
      const cx = margin + idx * cWidth + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(161, 161, 170);
      doc.text(c.label, cx, y + 13);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(c.val, cx, y + 20);
    });

    y += 30;
  }

  // Market Sentiment Block
  if (sentiment) {
    doc.setFillColor(24, 24, 27);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(245, 158, 11);
    doc.text('MARKET NEWS SENTIMENT (GOOGLE SEARCH GROUNDED)', margin + 6, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(228, 228, 231);
    doc.text(
      `Sentiment: ${sentiment.label} (Score: ${sentiment.score > 0 ? '+' : ''}${sentiment.score})  |  Consensus: ${sentiment.bullPercentage}% Bulls / ${sentiment.bearPercentage}% Bears`,
      margin + 6,
      y + 13
    );

    y += 22;
  }

  // 5. Technical Reasoning & Chart Notes
  doc.setFillColor(18, 18, 22);
  const textHeight = 55;
  doc.roundedRect(margin, y, contentWidth, textHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11);
  doc.text('TECHNICAL REASONING & MARKET ANALYSIS', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(212, 212, 216);

  const splitText = doc.splitTextToSize(analysis.explanation || 'No explanation provided.', contentWidth - 12);
  doc.text(splitText.slice(0, 10), margin + 6, y + 14);

  y += textHeight + 6;

  // 6. Embedded Chart Snapshot (if present and valid data URL)
  if (analysis.image_url && analysis.image_url.startsWith('data:image/')) {
    try {
      const isPng = analysis.image_url.includes('image/png');
      const format = isPng ? 'PNG' : 'JPEG';
      const imgHeight = Math.min(50, pageHeight - y - 24);
      if (imgHeight > 20) {
        doc.setFillColor(24, 24, 27);
        doc.roundedRect(margin, y, contentWidth, imgHeight, 2, 2, 'F');
        doc.addImage(analysis.image_url, format, margin + 2, y + 2, contentWidth - 4, imgHeight - 4);
        y += imgHeight + 4;
      }
    } catch (e) {
      console.warn('Could not embed chart screenshot in PDF:', e);
    }
  }

  // 7. Footer Disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(113, 113, 122);
  const disclaimer =
    'DISCLAIMER: RobexCapital signals are generated by automated technical AI models for educational reference only. Trading leveraged financial instruments carries substantial risk of capital loss. Verify all price quotes and risk management before execution.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisclaimer, margin, pageHeight - 10);

  // File Name
  const pairSanitized = (analysis.pair || 'SIGNAL').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `RobexCapital_${pairSanitized}_${analysis.signal}_${Date.now()}.pdf`;

  doc.save(filename);
}
