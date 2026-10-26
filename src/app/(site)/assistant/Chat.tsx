"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui/Button";
import { EMERGENCY_NUMBER } from "@/lib/nav";

type Kind = "approved" | "clarify" | "general" | "handoff" | "urgent" | "error";
type Message =
  | { id: number; role: "me"; text: string }
  | { id: number; role: "ai"; kind: Kind | null; text: string; source?: string; needsPharmacist: boolean; question: string; done: boolean };

const SUGGESTIONS = ["ينفع آخد بنادول مع دوا برد؟", "ابني عنده سخونية، أديله إيه؟", "نسيت آخد جرعة الدوا، أعمل إيه؟"];
const FAIL = "حصلت مشكلة ومقدرتش أرد دلوقتي. جرّب تاني بعد شوية، وفي الطوارئ كلّم 123.";
const WA = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");

function sessionId() {
  try {
    const saved = sessionStorage.getItem("sanad-sid");
    if (saved) return saved;
  } catch {
    /* storage blocked */
  }
  const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    sessionStorage.setItem("sanad-sid", id);
  } catch {
    /* fine: one id per page load */
  }
  return id;
}

function whatsappHref(question: string) {
  return WA ? `https://wa.me/${WA}?text=${encodeURIComponent(`السلام عليكم، عندي سؤال من سَنَد: ${question}`)}` : null;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const pending = useRef<{ question: string } | null>(null); // set while the assistant waits for a clarification
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, reduce]);

  function patch(id: number, update: Partial<Extract<Message, { role: "ai" }>>) {
    setMessages((all) => all.map((m) => (m.id === id && m.role === "ai" ? { ...m, ...update } : m)));
  }

  async function ask(shown: string) {
    const text = shown.trim();
    if (!text || busy) return;
    const followup = !!pending.current;
    const question = followup ? `${pending.current!.question} — ${text}`.slice(0, 500) : text;
    pending.current = null;
    setInput("");
    setBusy(true);

    const aiId = nextId.current + 1;
    nextId.current += 2;
    setMessages((all) => [
      ...all,
      { id: aiId - 1, role: "me", text },
      { id: aiId, role: "ai", kind: null, text: "", needsPharmacist: false, question, done: false },
    ]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, session: sessionId(), followup }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        patch(aiId, { kind: "error", text: err?.text ?? FAIL, done: true });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let kind: Kind | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line);
          if (e.t === "meta") {
            kind = e.kind;
            patch(aiId, { kind: e.kind, source: e.source, needsPharmacist: e.needsPharmacist });
          } else if (e.t === "delta") {
            acc += e.text;
            patch(aiId, { text: acc });
          } else if (e.t === "replace") {
            acc = e.text;
            patch(aiId, { text: acc });
          }
        }
      }
      patch(aiId, { done: true, ...(acc ? {} : { kind: "error", text: FAIL }) });
      if (kind === "clarify") pending.current = { question };
    } catch {
      patch(aiId, { kind: "error", text: FAIL, done: true });
    } finally {
      setBusy(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
      {messages.length > 0 && (
        <div ref={logRef} aria-live="polite" className="flex max-h-[min(62vh,600px)] min-h-48 flex-col gap-3 overflow-y-auto p-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                className={m.role === "me" ? "self-start max-w-[90%]" : "self-end max-w-[92%]"}
              >
                {m.role === "me" ? (
                  <p className="rounded-[18px] rounded-es-md bg-green px-4 py-2.5 text-on-green">{m.text}</p>
                ) : (
                  <Reply message={m} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <form onSubmit={submit} className={`grid gap-3 p-4 ${messages.length ? "border-t border-line" : ""}`}>
        <label htmlFor="q" className="text-sm font-medium">
          {pending.current ? "وضّح أكتر" : "سؤالك"}
        </label>
        <div className="flex items-center gap-2">
                    <input
            id="q"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            autoComplete="off"
            enterKeyHint="send"
            className="min-w-0 flex-1 rounded-full border-[1.5px] border-line bg-paper px-4 py-3 outline-none transition focus:border-green-2 focus:ring-4 focus:ring-green-2/15"
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="ابعت السؤال" className={buttonClass("primary", "!size-12 !p-0 shrink-0")}>
            <Icon name="send" size={20} className="-scale-x-100" />
          </button>
        </div>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border-[1.5px] border-line px-3.5 py-1.5 text-sm transition hover:border-green-2">
                {s}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

function Reply({ message: m }: { message: Extract<Message, { role: "ai" }> }) {
  const urgent = m.kind === "urgent";
  const tone = urgent ? "border-urgent bg-urgent-soft" : m.kind === "error" ? "border-transparent bg-sun-soft" : "border-line bg-paper";
  const showHelp = m.done && (m.kind === "handoff" || urgent || m.needsPharmacist);
  const wa = whatsappHref(m.question);

  if (!m.text && !m.done) {
    return (
      <div className="flex gap-1.5 rounded-[18px] border border-line bg-paper px-4 py-3.5" aria-label="بيكتب">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 animate-bounce rounded-full bg-green-2" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 rounded-[18px] rounded-ee-md border px-4 py-3 ${tone}`}>
      <div className="grid gap-1.5 whitespace-pre-line leading-[1.85]">{m.text}</div>
      {urgent && (
        <a href={`tel:${EMERGENCY_NUMBER}`} className="font-display text-2xl font-bold text-urgent" dir="ltr">
          {EMERGENCY_NUMBER}
        </a>
      )}
      {m.done && m.source && <p className="border-t border-dashed border-line pt-2 text-xs text-muted">{m.kind === "approved" ? `المصدر: ${m.source}` : m.source}</p>}
      {m.done && m.needsPharmacist && (m.kind === "approved" || m.kind === "general") && (
        <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm">حالتك محتاجة الصيدلي يشوفها.</p>
      )}
      {showHelp && (
        <div className="grid gap-2 pt-1">
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className={buttonClass("whatsapp", "!min-h-10 justify-self-start text-sm")}>
              كلّم الصيدلي على واتساب
            </a>
          )}
          {!urgent && <CallBack question={m.question} />}
        </div>
      )}
    </div>
  );
}

function CallBack({ question }: { question: string }) {
  const [code, setCode] = useState("+20");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; text?: string }>({ status: "idle" });

  async function send(e: FormEvent) {
    e.preventDefault();
    const cc = code.replace(/\D/g, "");
    const num = phone.replace(/\D/g, "").replace(/^0+/, "");
    const full = cc + num;
    if (!cc || num.length < 6 || full.length < 8 || full.length > 15) {
      setState({ status: "error", text: "اكتب مفتاح الدولة ورقمك بالأرقام." });
      return;
    }
    setState({ status: "sending" });
    const res = await fetch("/api/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: full, question, session: sessionId() }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setState(res?.ok ? { status: "done", text: data?.text } : { status: "error", text: data?.text ?? FAIL });
  }

  if (state.status === "done") return <p className="text-sm font-medium text-green">{state.text}</p>;
  return (
    <form onSubmit={send} className="grid gap-1.5">
      <span className="text-sm text-muted">أو ابعت رقمك:</span>
      <div className="flex gap-1.5" dir="ltr">
        <input aria-label="مفتاح الدولة" value={code} onChange={(e) => setCode(e.target.value)} inputMode="tel" maxLength={5} className="w-[4.6rem] rounded-xl border-[1.5px] border-line bg-surface px-2.5 py-2 text-left outline-none focus:border-green-2" />
        <input aria-label="رقم الموبايل" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={15} autoComplete="tel-national" className="min-w-0 flex-1 rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-left outline-none focus:border-green-2" />
        <button type="submit" disabled={state.status === "sending"} className={buttonClass("primary", "!min-h-10 !px-4 text-sm")}>
          ابعت
        </button>
      </div>
      {state.status === "error" && <span className="text-xs text-urgent">{state.text}</span>}
    </form>
  );
}
