import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ghost" | "whatsapp";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 font-medium leading-snug transition-[transform,box-shadow] duration-200 active:scale-[0.97] disabled:cursor-wait disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-green text-on-green hover:-translate-y-px hover:shadow-card",
  ghost: "text-ink ring-[1.5px] ring-inset ring-line hover:ring-green-2",
  whatsapp: "bg-wa text-white hover:-translate-y-px hover:shadow-card",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

export function LinkButton({ variant = "primary", className = "", ...props }: LinkButtonProps) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}
