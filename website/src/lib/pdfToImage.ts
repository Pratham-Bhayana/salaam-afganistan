/** Render the first page of a PDF to a PNG File for OCR (browser only). */
export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export async function pdfFirstPageToImageFile(file: File, scale = 2.5): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("PDF conversion must run in the browser");
  }

  const pdfjs = await import("pdfjs-dist");
  try {
    // Prefer the worker bundled with the app (works offline, no CDN/CORS risk).
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create canvas for PDF rendering");

  await page.render({ canvas, canvasContext: context, viewport }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to convert PDF page to image"))),
      "image/png",
      0.92,
    );
  });

  const baseName = file.name.replace(/\.pdf$/i, "") || "passport";
  return new File([blob], `${baseName}-page1.png`, { type: "image/png" });
}
