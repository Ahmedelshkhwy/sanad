"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

const toWestern = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/**
 * Five boxes, one character each (letters or digits). Typing moves to the next box,
 * Backspace moves back, and pasting fills them all. The value is submitted as `name`.
 */
export function PinInput({ name, length = 5, label, autoFocus }: { name: string; length?: number; label: string; autoFocus?: boolean }) {
  const [chars, setChars] = useState<string[]>(() => Array(length).fill(""));
  const [show, setShow] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setAt(i: number, value: string) {
    setChars((c) => c.map((x, j) => (j === i ? value : x)));
  }

  function onChange(i: number, raw: string) {
    const clean = toWestern(raw).replace(/[^\p{L}\p{N}]/gu, "");
    if (!clean) return setAt(i, "");
    if (clean.length > 1) return fill(i, clean);
    setAt(i, clean);
    refs.current[i + 1]?.focus();
  }

  function fill(from: number, value: string) {
    const letters = [...value].slice(0, length - from);
    setChars((c) => c.map((x, j) => (j >= from && j - from < letters.length ? letters[j - from] : x)));
    refs.current[Math.min(from + letters.length, length - 1)]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, "");
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft") {
      refs.current[i + 1]?.focus();
    } else if (e.key === "ArrowRight") {
      refs.current[i - 1]?.focus();
    }
  }

  function onPaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    fill(i, toWestern(e.clipboardData.getData("text")).replace(/[^\p{L}\p{N}]/gu, ""));
  }

  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-2" dir="ltr">
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={c}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
            type={show ? "text" : "password"}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus={autoFocus && i === 0}
            aria-label={`${label}، الخانة ${i + 1} من ${length}`}
            className="size-12 rounded-xl border-[1.5px] border-line bg-surface text-center font-display text-xl outline-none transition focus:border-green-2 focus:ring-4 focus:ring-green-2/15 sm:size-14"
          />
        ))}
        <button type="button" onClick={() => setShow((s) => !s)} className="ms-1 text-sm text-muted underline underline-offset-4" aria-pressed={show}>
          {show ? "اخفي" : "اظهر"}
        </button>
      </div>
      <input type="hidden" name={name} value={chars.join("")} />
    </fieldset>
  );
}
