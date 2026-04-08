"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import ko from "./ko.json";
import en from "./en.json";

export type Locale = "ko" | "en";

const translations: Record<Locale, Record<string, string>> = { ko, en };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start with "en" on both server and client to avoid hydration mismatch
  const [locale, setLocaleState] = useState<Locale>("en");

  // After mount, read saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dr_locale") as Locale | null;
    if (saved && saved !== "en") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("dr_locale", l);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[locale]?.[key] ?? translations["en"]?.[key] ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within LanguageProvider");
  return ctx.t;
}

export function useLocale() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale must be used within LanguageProvider");
  return { locale: ctx.locale, setLocale: ctx.setLocale };
}

/** Language toggle component */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <button
      className={`inline-flex items-center gap-1 text-[13px] text-[#a39e98] hover:text-[rgba(0,0,0,0.95)] transition-colors ${className ?? ""}`}
      onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
    >
      <span className={locale === "en" ? "font-semibold text-[rgba(0,0,0,0.95)]" : ""}>EN</span>
      <span>/</span>
      <span className={locale === "ko" ? "font-semibold text-[rgba(0,0,0,0.95)]" : ""}>한</span>
    </button>
  );
}
