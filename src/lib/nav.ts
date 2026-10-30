/** Only routes that exist are listed here. Add a page, then add its link. */
export const NAV = [
  { href: "/assistant", label: "المساعد الدوائي" },
  { href: "/requests", label: "البحث عن دوا" },
  { href: "/community", label: "المجتمع" },
] as const;

export const EMERGENCY_NUMBER = "123";

/** How people reach the Sanad team (shown in the footer and wherever we say "كلّم الصيدلي"). */
export const CONTACT = {
  whatsapp: "966567796790",
  email: "ahmedelshkhwy@gmail.com",
};
