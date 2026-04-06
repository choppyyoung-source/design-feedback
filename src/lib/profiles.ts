export type DesignerSpecialty =
  | "ui-ux"
  | "graphic"
  | "product"
  | "brand"
  | "motion"
  | "frontend"
  | "fullstack"
  | "other";

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
  ratings: {
    from: string;
    score: number;
    comment: string;
    createdAt: string;
  }[];
  createdAt: string;
}

const KEY = "dr_profiles";

function getAll(): Record<string, UserProfile> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(profiles: Record<string, UserProfile>) {
  localStorage.setItem(KEY, JSON.stringify(profiles));
}

export function getProfile(email: string): UserProfile | null {
  return getAll()[email] ?? null;
}

export function saveProfile(profile: UserProfile) {
  const all = getAll();
  all[profile.email] = profile;
  saveAll(all);
}

export function getAllProfiles(): UserProfile[] {
  return Object.values(getAll()).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );
}

export function addRating(
  targetEmail: string,
  from: string,
  score: number,
  comment: string
) {
  const all = getAll();
  const profile = all[targetEmail];
  if (!profile) return;
  profile.ratings.push({
    from,
    score,
    comment,
    createdAt: new Date().toISOString(),
  });
  saveAll(all);
}
