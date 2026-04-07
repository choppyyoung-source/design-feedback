import type { Annotation, Project, Review } from "@/types";

interface StoredReview {
  review: Review;
  annotations: Annotation[];
  updatedAt: string;
  projectId?: string;
}

interface StoredProject {
  project: Project;
  annotations: Record<string, Annotation[]>; // pageId -> annotations
  updatedAt: string;
}

const REVIEWS_KEY = "dr_reviews";
const PROJECTS_KEY = "dr_projects";

// --- Reviews (legacy single-page) ---
export function saveReview(review: Review, annotations: Annotation[]) {
  const all = getAllReviews();
  all[review.id] = {
    review,
    annotations,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
}

export function getReview(id: string): StoredReview | null {
  const all = getAllReviews();
  return all[id] ?? null;
}

export function getAllReviews(): Record<string, StoredReview> {
  try {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getUserReviews(email: string): StoredReview[] {
  const all = getAllReviews();
  return Object.values(all)
    .filter((r) => r.review.created_by === email)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteReview(id: string) {
  const all = getAllReviews();
  delete all[id];
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
}

// --- Projects (multi-page) ---
export function saveProject(
  project: Project,
  annotations: Record<string, Annotation[]>
) {
  const all = getAllProjects();
  all[project.id] = {
    project,
    annotations,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
}

export function getProject(id: string): StoredProject | null {
  const all = getAllProjects();
  return all[id] ?? null;
}

export function getAllProjects(): Record<string, StoredProject> {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getUserProjects(email: string): StoredProject[] {
  const all = getAllProjects();
  return Object.values(all)
    .filter((p) => p.project.created_by === email)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getOtherProjects(email: string): StoredProject[] {
  const all = getAllProjects();
  return Object.values(all)
    .filter((p) => p.project.created_by !== email && p.project.created_by !== "")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getPublicProjects(): StoredProject[] {
  const all = getAllProjects();
  return Object.values(all)
    .filter((p) => p.project.created_by !== "" && (p.project.status ?? "receiving") === "receiving")
    .sort((a, b) => b.project.created_at.localeCompare(a.project.created_at));
}

export function deleteProject(id: string) {
  const all = getAllProjects();
  delete all[id];
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
}
