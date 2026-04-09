import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  dbGetProfile,
  dbSaveProfile,
  dbGetAllProfiles,
  dbAddRating,
} from "@/lib/supabase/db";

export type DesignerSpecialty =
  | "ui-ux"
  | "graphic"
  | "product"
  | "brand"
  | "motion"
  | "frontend"
  | "fullstack"
  | "other";

// i18n keys for specialty labels — use t(`specialty.${key}`) to get translated label
export const SPECIALTY_KEYS: Record<DesignerSpecialty, string> = {
  "ui-ux": "specialty.ui-ux",
  graphic: "specialty.graphic",
  product: "specialty.product",
  brand: "specialty.brand",
  motion: "specialty.motion",
  frontend: "specialty.frontend",
  fullstack: "specialty.fullstack",
  other: "specialty.other",
};

// Legacy compat — returns Korean labels (use SPECIALTY_KEYS + t() for i18n)
export const SPECIALTY_LABELS: Record<DesignerSpecialty, string> = {
  "ui-ux": "UI/UX 디자이너",
  graphic: "그래픽 디자이너",
  product: "프로덕트 디자이너",
  brand: "브랜드 디자이너",
  motion: "모션 디자이너",
  frontend: "프론트엔드 개발자",
  fullstack: "풀스택 개발자",
  other: "기타",
};

export interface UserProfile {
  email: string;
  name: string;
  specialty: DesignerSpecialty;
  bio: string;
  experience: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  isPrivate?: boolean;
  payoutMethod?: "paypal" | "bank" | null;
  paypalEmail?: string;
  bankInfo?: string; // 은행명 + 계좌번호 (자유 입력)
  ratings: {
    from: string;
    score: number;
    comment: string;
    createdAt: string;
  }[];
  createdAt: string;
}

// ─── localStorage helpers ───

const KEY = "dr_profiles";

function _lsGetAll(): Record<string, UserProfile> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

function _lsSaveAll(profiles: Record<string, UserProfile>) {
  localStorage.setItem(KEY, JSON.stringify(profiles));
}

// ─── Public API (Supabase + localStorage fallback) ───

// Sync — instant localStorage read (for fast initial paint)
export function getAllProfilesLocal(): UserProfile[] {
  if (typeof window === "undefined") return [];
  return Object.values(_lsGetAll()).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );
}

export async function getProfile(email: string): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    try {
      const result = await dbGetProfile(email);
      if (result) return result;
    } catch (e) { console.error("Supabase getProfile:", e); }
  }
  // Always check localStorage as fallback (Supabase may not have this profile yet)
  return _lsGetAll()[email] ?? null;
}

export async function saveProfile(profile: UserProfile) {
  // Always save to localStorage as cache
  const all = _lsGetAll();
  all[profile.email] = profile;
  _lsSaveAll(all);

  if (isSupabaseConfigured()) {
    await dbSaveProfile(profile).catch(console.error);
  }
}

export async function getAllProfiles(): Promise<UserProfile[]> {
  const lsProfiles = Object.values(_lsGetAll());

  if (isSupabaseConfigured()) {
    try {
      const dbProfiles = await dbGetAllProfiles();
      // Merge: Supabase + localStorage (localStorage fills gaps)
      const byEmail = new Map<string, UserProfile>();
      for (const p of lsProfiles) byEmail.set(p.email, p);
      for (const p of dbProfiles) byEmail.set(p.email, p); // DB takes priority
      return Array.from(byEmail.values()).sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );
    } catch (e) { console.error("Supabase getAllProfiles:", e); }
  }
  return lsProfiles.sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );
}

export async function addRating(
  targetEmail: string,
  from: string,
  score: number,
  comment: string
) {
  // localStorage update
  const all = _lsGetAll();
  const profile = all[targetEmail];
  if (profile) {
    profile.ratings.push({ from, score, comment, createdAt: new Date().toISOString() });
    _lsSaveAll(all);
  }

  if (isSupabaseConfigured()) {
    await dbAddRating(targetEmail, from, score, comment).catch(console.error);
  }
}
