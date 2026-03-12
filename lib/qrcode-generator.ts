import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ============================================
// TYPES
// ============================================

export interface SiswaQR {
  nis: string;
  nama: string;
  kelas: string;
}

// ============================================
// CONSTANTS (A4 & QR SIZE)
// ============================================

// A4 Portrait: 210mm x 297mm = 793px x 1122px (at 96 DPI)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const QR_SIZE_MM = 40; // 4cm x 4cm
const QR_SIZE_PX = 151; // ~4cm at 96 DPI

// Grid layout: 4 columns x 7 rows = 28 QR codes per page
const COLS = 4;
const ROWS = 7;
const QR_PER_PAGE = COLS * ROWS;

// Margins & spacing (mm)
const MARGIN_TOP = 10;
const MARGIN_LEFT = 10;
const SPACING_X = (A4_WIDTH_MM - 2 * MARGIN_LEFT - COLS * QR_SIZE_MM) / (COLS - 1);
const SPACING_Y = (A4_HEIGHT_MM - 2 * MARGIN_TOP - ROWS * QR_SIZE_MM) / (ROWS - 1);

// ============================================
// HELPER: GROUP BY PAGES
// ============================================

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ============================================
// MAIN: GENERATE QR CODE PDF
// ============================================

export async function generateQRCodePDF(
  siswaList: SiswaQR[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (siswaList.length === 0) {
    throw new Error("Tidak ada siswa untuk di-generate QR Code");
  }

  // Split siswa into pages
  const pages = chunkArray(siswaList, QR_PER_PAGE);
  const totalPages = pages.length;

  // Create PDF (A4 Portrait)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const siswaOnPage = pages[pageIndex];

    // Create temporary canvas for this page
    const canvas = await renderPageToCanvas(siswaOnPage);

    // Convert canvas to image
    const imgData = canvas.toDataURL("image/png");

    // Add to PDF
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

    // Progress callback
    if (onProgress) onProgress(pageIndex + 1, totalPages);
  }

  // Download PDF
  const timestamp = new Date().toISOString().slice(0, 10);
  pdf.save(`QR-Siswa-${timestamp}.pdf`);
}

// ============================================
// RENDER PAGE TO CANVAS
// ============================================

async function renderPageToCanvas(siswaList: SiswaQR[]): Promise<HTMLCanvasElement> {
  // Create hidden container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = `${A4_WIDTH_MM * 3.78}px`; // mm to px (96 DPI)
  container.style.height = `${A4_HEIGHT_MM * 3.78}px`;
  container.style.background = "#ffffff";
  container.style.padding = "0";
  document.body.appendChild(container);

  // Render QR codes in grid
  siswaList.forEach((siswa, index) => {
    const row = Math.floor(index / COLS);
    const col = index % COLS;

    const qrWrapper = document.createElement("div");
    qrWrapper.style.position = "absolute";
    qrWrapper.style.left = `${(MARGIN_LEFT + col * (QR_SIZE_MM + SPACING_X)) * 3.78}px`;
    qrWrapper.style.top = `${(MARGIN_TOP + row * (QR_SIZE_MM + SPACING_Y)) * 3.78}px`;
    qrWrapper.style.width = `${QR_SIZE_MM * 3.78}px`;
    qrWrapper.style.display = "flex";
    qrWrapper.style.flexDirection = "column";
    qrWrapper.style.alignItems = "center";
    qrWrapper.style.gap = "6px";

    // QR Code Canvas
    const qrCanvas = document.createElement("canvas");
    qrCanvas.width = QR_SIZE_PX;
    qrCanvas.height = QR_SIZE_PX;

    // Generate QR with qrcode.react logic (manual)
    const QRCode = require("qrcode");
    QRCode.toCanvas(qrCanvas, siswa.nis, {
      width: QR_SIZE_PX,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    qrWrapper.appendChild(qrCanvas);

    // Name label
    const nameLabel = document.createElement("div");
    nameLabel.textContent = siswa.nama;
    nameLabel.style.fontSize = "11px";
    nameLabel.style.fontWeight = "600";
    nameLabel.style.color = "#000";
    nameLabel.style.textAlign = "center";
    nameLabel.style.maxWidth = `${QR_SIZE_MM * 3.78}px`;
    nameLabel.style.overflow = "hidden";
    nameLabel.style.textOverflow = "ellipsis";
    nameLabel.style.whiteSpace = "nowrap";

    qrWrapper.appendChild(nameLabel);

    // Kelas label
    const kelasLabel = document.createElement("div");
    kelasLabel.textContent = siswa.kelas;
    kelasLabel.style.fontSize = "9px";
    kelasLabel.style.color = "#666";
    kelasLabel.style.textAlign = "center";

    qrWrapper.appendChild(kelasLabel);

    container.appendChild(qrWrapper);
  });

  // Wait for QR codes to render
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Convert to canvas with html2canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    backgroundColor: "#ffffff",
    logging: false,
  });

  // Cleanup
  document.body.removeChild(container);

  return canvas;
}

// ============================================
// ALTERNATIVE: DOWNLOAD INDIVIDUAL QR PNG
// ============================================

export async function downloadSingleQR(siswa: SiswaQR): Promise<void> {
  const canvas = document.createElement("canvas");
  const size = 300; // Higher resolution for single QR
  canvas.width = size;
  canvas.height = size + 80; // Extra space for name

  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Generate QR
  const QRCode = require("qrcode");
  const qrDataURL = await QRCode.toDataURL(siswa.nis, {
    width: size,
    margin: 2,
  });

  // Draw QR
  const qrImage = new Image();
  qrImage.src = qrDataURL;

  await new Promise((resolve) => {
    qrImage.onload = () => {
      ctx.drawImage(qrImage, 0, 0, size, size);

      // Draw name
      ctx.fillStyle = "#000000";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(siswa.nama, size / 2, size + 30);

      // Draw kelas
      ctx.font = "14px Arial";
      ctx.fillStyle = "#666666";
      ctx.fillText(siswa.kelas, size / 2, size + 55);

      resolve(null);
    };
  });

  // Download
  const link = document.createElement("a");
  link.download = `QR-${siswa.nis}-${siswa.nama}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}