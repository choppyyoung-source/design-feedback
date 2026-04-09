import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design Feedback — Get design reviews, apply with AI",
  description:
    "Upload your design or paste a link. Get actionable feedback from designers, then apply it directly with AI. Free, no sign-up required.",
  metadataBase: new URL("https://design-feedback-hykim-permissionlabs-projects.vercel.app"),
  openGraph: {
    title: "Design Feedback — Get design reviews, apply with AI",
    description:
      "Upload your design or paste a link. Get actionable feedback from designers, then apply it directly with AI.",
    url: "https://design-feedback-hykim-permissionlabs-projects.vercel.app",
    siteName: "Design Feedback",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Design Feedback — AI-powered design review tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Design Feedback — Get design reviews, apply with AI",
    description:
      "Upload your design or paste a link. Get actionable feedback from designers, then apply it directly with AI.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
