"use client";

import { useState } from "react";
import { PhoneForms } from "./PhoneForms";
import { LoginForm } from "./LoginForm";

/** Phone + PIN first (most people here have no email); email link as the alternative. */
export function LoginChooser() {
  const [email, setEmail] = useState(false);
  if (!email) return <PhoneForms onEmail={() => setEmail(true)} />;
  return (
    <div className="grid gap-4">
      <LoginForm />
      <button type="button" onClick={() => setEmail(false)} className="justify-self-start text-sm text-green-2 underline underline-offset-4">
        ارجع للدخول برقم الموبايل
      </button>
    </div>
  );
}
