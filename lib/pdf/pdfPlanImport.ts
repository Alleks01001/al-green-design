const PDFJS_MODULE_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs";

type PdfViewport = { width: number; height: number };
type PdfRenderTask = { promise: Promise<void> };
type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => PdfRenderTask;
};
type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => Promise<void>;
};
type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
};

export type RenderedPdfPlan = {
  dataUrl: string;
  pageCount: number;
  pageNumber: number;
  aspectRatio: number;
  pixelWidth: number;
  pixelHeight: number;
};

async function loadPdfJs(): Promise<PdfJsModule> {
  const pdfjs = await import(/* webpackIgnore: true */ PDFJS_MODULE_URL) as unknown as PdfJsModule;
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  return pdfjs;
}

export async function renderPdfPlan(file: File, pageNumber = 1): Promise<RenderedPdfPlan> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  try {
    const safePageNumber = Math.max(1, Math.min(pageNumber, pdf.numPages));
    const page = await pdf.getPage(safePageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const desiredWidth = 1800;
    const scale = Math.max(1.25, Math.min(3, desiredWidth / Math.max(baseViewport.width, 1)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("PDF-Zeichenfläche konnte nicht erstellt werden.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.94),
      pageCount: pdf.numPages,
      pageNumber: safePageNumber,
      aspectRatio: canvas.width / Math.max(canvas.height, 1),
      pixelWidth: canvas.width,
      pixelHeight: canvas.height
    };
  } finally {
    await pdf.destroy?.();
  }
}
