const A4_LANDSCAPE_WIDTH = 841.89;
const A4_LANDSCAPE_HEIGHT = 595.28;
const PDF_MARGIN = 24;
const EXPORT_WIDTH = 2000;

const STYLE_PROPERTIES = [
  "fill", "fill-opacity", "stroke", "stroke-opacity", "stroke-width", "stroke-dasharray",
  "stroke-linecap", "stroke-linejoin", "opacity", "font-family", "font-size", "font-style",
  "font-weight", "letter-spacing", "text-anchor", "paint-order"
] as const;

function encodeAscii(value: string) {
  return new TextEncoder().encode(value);
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function inlineSvgStyles(source: SVGSVGElement, clone: SVGSVGElement) {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<SVGElement>("*"))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<SVGElement>("*"))];
  sourceNodes.forEach((node, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;
    const computed = window.getComputedStyle(node);
    const style = STYLE_PROPERTIES
      .map(property => `${property}:${computed.getPropertyValue(property)}`)
      .filter(value => !value.endsWith(":"))
      .join(";");
    if (style) cloneNode.setAttribute("style", style);
  });
}

async function svgToJpeg(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  inlineSvgStyles(svg, clone);
  clone.querySelectorAll(".draftGeometry").forEach(element => element.remove());
  clone.querySelectorAll('[data-layer-printable="false"]').forEach(element => element.remove());

  const viewBox = svg.viewBox.baseVal;
  const ratio = viewBox.width > 0 && viewBox.height > 0 ? viewBox.width / viewBox.height : 10 / 7;
  const width = EXPORT_WIDTH;
  const height = Math.max(1, Math.round(width / ratio));
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const markup = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Der CAD-Plan konnte nicht für den PDF-Export gerendert werden."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("PDF-Exportfläche konnte nicht erstellt werden.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.94), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function createSinglePagePdf(jpeg: Uint8Array, imageWidth: number, imageHeight: number) {
  const availableWidth = A4_LANDSCAPE_WIDTH - PDF_MARGIN * 2;
  const availableHeight = A4_LANDSCAPE_HEIGHT - PDF_MARGIN * 2;
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const x = (A4_LANDSCAPE_WIDTH - drawWidth) / 2;
  const y = (A4_LANDSCAPE_HEIGHT - drawHeight) / 2;
  const content = `q\n${drawWidth.toFixed(3)} 0 0 ${drawHeight.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm\n/Im0 Do\nQ\n`;
  const contentBytes = encodeAscii(content);

  const objects: Uint8Array[] = [
    encodeAscii("<< /Type /Catalog /Pages 2 0 R >>"),
    encodeAscii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    encodeAscii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_LANDSCAPE_WIDTH} ${A4_LANDSCAPE_HEIGHT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    concatBytes([
      encodeAscii(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      encodeAscii("\nendstream")
    ]),
    concatBytes([
      encodeAscii(`<< /Length ${contentBytes.length} >>\nstream\n`),
      contentBytes,
      encodeAscii("endstream")
    ])
  ];

  const header = encodeAscii("%PDF-1.4\n% AL Green Design Studio\n");
  const parts: Uint8Array[] = [header];
  const offsets = [0];
  let byteOffset = header.length;

  objects.forEach((object, index) => {
    const prefix = encodeAscii(`${index + 1} 0 obj\n`);
    const suffix = encodeAscii("\nendobj\n");
    offsets.push(byteOffset);
    parts.push(prefix, object, suffix);
    byteOffset += prefix.length + object.length + suffix.length;
  });

  const xrefOffset = byteOffset;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    ""
  ].join("\n");
  parts.push(encodeAscii(xref));
  return concatBytes(parts);
}

function safeFileName(value: string) {
  const cleaned = value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_");
  return cleaned || "AL_Green_Design_Plan";
}

export async function exportCadPlanToPdf(projectName: string) {
  const svg = document.querySelector<SVGSVGElement>('svg[data-algreen-cad-canvas="true"]');
  if (!svg) throw new Error("Für den PDF-Export muss die 2D-Ansicht sichtbar sein.");
  const rendered = await svgToJpeg(svg);
  const jpeg = dataUrlToBytes(rendered.dataUrl);
  const pdf = createSinglePagePdf(jpeg, rendered.width, rendered.height);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(projectName)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
