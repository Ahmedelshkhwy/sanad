"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { phoneSignIn, phoneSignUp, type AuthState } from "./phone-actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextInput, inputClass } from "@/components/ui/Field";
import { PinInput } from "@/components/ui/PinInput";
import { idle } from "@/lib/form";
import { CONTACT } from "@/lib/nav";

function PhoneField() {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">رقم الموبايل</legend>
      <div className="flex gap-2" dir="ltr">
        <input name="cc" defaultValue="+20" inputMode="tel" maxLength={5} aria-label="مفتاح الدولة" className={`${inputClass} !w-[5rem] text-left`} />
        <input name="phone" required inputMode="tel" autoComplete="tel-national" maxLength={15} aria-label="رقم الموبايل" className={`${inputClass} text-left`} />
      </div>
    </fieldset>
  );
}

export function PhoneForms({ onEmail }: { onEmail: () => void }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(phoneSignIn, idle);
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(phoneSignUp, idle);
  const target = inState.next ?? upState.next;
  useEffect(() => {
    // a full load, not a client transition, so nothing cached from before sign-in is reused
    if (target) window.location.assign(target);
  }, [target]);

  return (
    <div className="grid gap-5">
      <div role="tablist" aria-label="نوع الدخول" className="grid grid-cols-2 rounded-full border border-line bg-surface p-1 text-sm">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full py-2 font-medium transition ${mode === m ? "bg-green text-on-green" : "text-muted hover:text-ink"}`}
          >
            {m === "in" ? "عندي حساب" : "حساب جديد"}
          </button>
        ))}
      </div>

      {mode === "in" ? (
        <form action={inAction} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <PhoneField />
          <PinInput name="pin" label="الرقم السري" />
          <FormMessage state={inState} />
          <Button type="submit" disabled={inPending || !!target}>
            {inPending ? "بندخّلك…" : "دخول"}
          </Button>
          <p className="text-sm text-muted">
            نسيت الرقم السري؟{" "}
            <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener" className="text-green-2 underline underline-offset-4">
              كلّم الصيدلي على واتساب
            </a>{" "}
            وهو يعملك رقم جديد.
          </p>
        </form>
      ) : (
        <form action={upAction} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <Field label="اسمك">
            <TextInput name="name" required maxLength={60} autoComplete="name" />
          </Field>
          <PhoneField />
          <PinInput name="pin" label="اختار رقم سري" />
          <PinInput name="pin_confirm" label="اكتبه تاني للتأكيد" />
          <p className="text-xs text-muted">٥ خانات، أرقام أو حروف زي ما تحب. احفظه كويس.</p>
          <FormMessage state={upState} />
          <Button type="submit" disabled={upPending || !!target}>
            {upPending ? "بنعمل حسابك…" : "اعمل الحساب"}
          </Button>
        </form>
      )}

      <button type="button" onClick={onEmail} className="justify-self-start text-sm text-green-2 underline underline-offset-4">
        أو ادخل بالإيميل
      </button>
    </div>
  );
}
