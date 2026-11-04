"use client";

import { useEffect, useId, useRef, useState } from "react";

const MAX_SIDE = 1600;

/**
 * Redraws the photo on a canvas: smaller upload, upright, and without the camera's
 * hidden data (location, device), which a canvas never copies.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.82));
  if (!blob) throw new Error("encode");
  return blob;
}

export function PhotoPicker({ label, hint, onChange }: { label: string; hint: string; onChange: (photo: Blob | null) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    setError("");
    if (!file) return;
    setBusy(true);
    try {
      const blob = await shrink(file);
      setPreview(URL.createObjectURL(blob));
      onChange(blob);
    } catch {
      setError("مقدرناش نفتح الصورة دي. جرّب صورة تانية أو صوّرها من الكاميرا.");
      onChange(null);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function clear() {
    setPreview(null);
    onChange(null);
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium" id={`${id}-label`}>
        {label}
      </span>
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
          <img src={preview} alt="" className="size-20 rounded-xl border border-line object-cover" />
          <button type="button" onClick={clear} className="text-sm text-urgent underline underline-offset-4">
            شيل الصورة
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="grid min-h-12 cursor-pointer place-items-center rounded-xl border-[1.5px] border-dashed border-line px-4 py-2.5 text-sm text-muted transition hover:border-green-2"
        >
          {busy ? "بنجهّز الصورة…" : "صوّر أو اختار صورة"}
        </label>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        aria-labelledby={`${id}-label`}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <span className="text-xs text-muted">{hint}</span>
      {error && (
        <span role="alert" className="text-xs text-urgent">
          {error}
        </span>
      )}
    </div>
  );
}
