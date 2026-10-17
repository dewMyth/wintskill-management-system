import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/** Draws every page of a PDF onto canvases (no file link, no download or print button). */
export function PdfCanvas({
  url,
  onError,
}: {
  url: string;
  onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The signed link is short-lived: fetch the whole file once, then render from memory.
      const data = await fetch(url).then((r) =>
        r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText)),
      );
      const pdf = await pdfjs.getDocument({ data }).promise;
      if (cancelled) return;
      setPages(pdf.numPages);
      const width = container.current!.clientWidth;
      for (let n = 1; n <= pdf.numPages && !cancelled; n++) {
        const page = await pdf.getPage(n);
        const scale =
          (width / page.getViewport({ scale: 1 }).width) *
          window.devicePixelRatio;
        const viewport = page.getViewport({ scale });
        const canvas = container.current?.querySelector<HTMLCanvasElement>(
          `canvas[data-page="${n}"]`,
        );
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
      }
    })().catch(() => !cancelled && onError());
    return () => {
      cancelled = true;
    };
  }, [url, onError]);

  return (
    <div ref={container} className="flex flex-col gap-3">
      {pages === 0 && <Skeleton className="aspect-[3/4] w-full" />}
      {Array.from({ length: pages }, (_, i) => (
        <canvas
          key={i}
          data-page={i + 1}
          aria-label={`Page ${i + 1}`}
          className="w-full rounded-md bg-white shadow-sm"
        />
      ))}
    </div>
  );
}

/** Draws an image onto a canvas so there is no "Save image as". */
export function ImageCanvas({
  url,
  onError,
}: {
  url: string;
  onError: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const blob = await fetch(url).then((r) =>
        r.ok ? r.blob() : Promise.reject(new Error(r.statusText)),
      );
      const bitmap = await createImageBitmap(blob);
      if (cancelled || !canvas.current) return;
      canvas.current.width = bitmap.width;
      canvas.current.height = bitmap.height;
      canvas.current.getContext('2d')!.drawImage(bitmap, 0, 0);
    })().catch(() => !cancelled && onError());
    return () => {
      cancelled = true;
    };
  }, [url, onError]);

  return (
    <canvas
      ref={canvas}
      aria-label="Image"
      className="w-full rounded-md bg-white"
    />
  );
}
