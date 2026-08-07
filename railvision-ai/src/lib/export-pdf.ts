import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProcessingResult } from "./api-types";

export function exportToPDF(result: ProcessingResult | null, stationName = "Vadodara Junction") {
  if (!result) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Title & Header
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(184, 255, 59); // Brand Green
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("RailVision AI", 14, 22);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("Investigation Report", 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text(`Station: ${stationName}`, pageWidth - 14, 22, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: "right" });

  // 2. Executive Summary
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("Executive Summary", 14, 50);

  const criticalAlerts = (result.alerts || []).filter(a => a.severity === "critical").length;
  
  let riskScore = 10;
  if (criticalAlerts > 0) riskScore += criticalAlerts * 15;
  if (result.crowd_analysis && result.crowd_analysis.maximum_people > 30) riskScore += 20;
  if (result.crime_detection && result.crime_detection.total_incidents > 0) riskScore += 25;
  riskScore = Math.min(riskScore, 100);

  const riskLabel = riskScore > 75 ? "CRITICAL" : riskScore > 40 ? "HIGH" : "NORMAL";

  autoTable(doc, {
    startY: 55,
    head: [["Metric", "Value", "Metric", "Value"]],
    body: [
      ["Video Processed", result.video || "CCTV_Feed", "Duration", `${(result.frames / result.fps).toFixed(1)}s`],
      ["System Risk Score", `${riskScore}/100 (${riskLabel})`, "AI Processing Time", `${result.processing_time?.toFixed(2)}s`],
      ["Total Alerts", `${result.alerts?.length || 0}`, "Critical Incidents", `${criticalAlerts}`]
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // 3. Crowd Analysis
  let nextY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 55;
  nextY += 15;
  
  if (result.crowd_analysis) {
    doc.setFontSize(14);
    doc.text("Crowd & Congestion Analysis", 14, nextY);
    
    autoTable(doc, {
      startY: nextY + 5,
      head: [["Parameter", "Measurement"]],
      body: [
        ["Peak Crowd Density", `${result.crowd_analysis.maximum_people} people`],
        ["Average Density", `${result.crowd_analysis.average_people.toFixed(1)} people`],
        ["Platform Occupancy", `${result.crowd_analysis.occupancy_percentage}%`],
        ["Congestion Status", result.crowd_analysis.density]
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] }
    });
    nextY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextY;
    nextY += 15;
  }

  // 4. Security & Incidents
  if (result.crime_detection) {
    // Page break if needed
    if (nextY > 250) {
      doc.addPage();
      nextY = 20;
    }

    doc.setFontSize(14);
    doc.text("Security & Incident Detection", 14, nextY);
    
    const securityData = [
      ["Abandoned Baggage", result.crime_detection.abandoned_baggage?.length || 0],
      ["Track Intrusions", result.crime_detection.track_intrusion?.length || 0],
      ["Restricted Area Violations", result.crime_detection.restricted_area?.length || 0],
      ["Loitering", result.crime_detection.loitering?.length || 0],
      ["Panic / Running", (result.crime_detection.crowd_panic?.length || 0) + (result.crime_detection.running_detection?.length || 0)],
      ["Physical Altercations", result.crime_detection.fight_detection?.length || 0]
    ];

    autoTable(doc, {
      startY: nextY + 5,
      head: [["Incident Type", "Count"]],
      body: securityData.filter(d => (d[1] as number) > 0), // Only show if > 0
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] }
    });
    nextY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextY;
    nextY += 15;
  }

  // 5. Alert Log
  if (result.alerts && result.alerts.length > 0) {
    if (nextY > 200) {
      doc.addPage();
      nextY = 20;
    }

    doc.setFontSize(14);
    doc.text("Chronological Alert Log", 14, nextY);

    const alertData = result.alerts.map(a => [
      `F${a.frame}`,
      a.severity.toUpperCase(),
      a.module.toUpperCase(),
      a.message,
      `${(a.confidence * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: nextY + 5,
      head: [["Frame", "Severity", "Module", "Details", "Confidence"]],
      body: alertData,
      theme: "striped",
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: "auto" },
        4: { cellWidth: 25 }
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          if (data.cell.raw === "CRITICAL") {
            data.cell.styles.textColor = [255, 0, 0];
            data.cell.styles.fontStyle = "bold";
          } else if (data.cell.raw === "HIGH") {
            data.cell.styles.textColor = [255, 122, 0];
          }
        }
      }
    });
  }

  // 6. Footer
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `RailVision AI Confidential Report — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const filename = `RailVision_Report_${new Date().getTime()}.pdf`;
  doc.save(filename);
}
