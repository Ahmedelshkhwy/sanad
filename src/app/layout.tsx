import type { Metadata, Viewport } from "next";
import { Reem_Kufi, Readex_Pro } from "next/font/google";
import "./globals.css";

const reemKufi = Reem_Kufi({
  variable: "--font-reem-kufi",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "سَنَد — الصحة المجتمعية", template: "%s | سَنَد" },
  description: "منصة صحية مجانية تبدأ من قريتنا: افهم دواك، ادوّر على دوا مش لاقيه، واسأل أهل بلدك.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1612" },
  ],
};

/** Applies the saved theme before first paint, so a returning visitor never sees a flash. */
const themeScript = `try{var t=localStorage.getItem('sanad-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${reemKufi.variable} ${readex.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
