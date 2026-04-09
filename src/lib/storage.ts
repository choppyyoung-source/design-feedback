import type { Annotation, Project, Review } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  dbSaveProject,
  dbGetUserProjects,
  dbGetPublicProjects,
  dbGetCompletedProjects,
  dbDeleteProject,
} from "@/lib/supabase/db";

export interface StoredReview {
  review: Review;
  annotations: Annotation[];
  updatedAt: string;
  projectId?: string;
}

export interface StoredProject {
  project: Project;
  annotations: Record<string, Annotation[]>;
  updatedAt: string;
}

const REVIEWS_KEY = "dr_reviews";
const PROJECTS_KEY = "dr_projects";

// ─── localStorage helpers ───

function _lsGetAll(): Record<string, StoredProject> {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function _lsSaveAll(all: Record<string, StoredProject>) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
}

// ─── Projects (Supabase + localStorage cache) ───

export async function saveProject(
  project: Project,
  annotations: Record<string, Annotation[]>
) {
  // Always save to localStorage as cache
  const all = _lsGetAll();
  all[project.id] = { project, annotations, updatedAt: new Date().toISOString() };
  _lsSaveAll(all);

  if (isSupabaseConfigured()) {
    await dbSaveProject(project, annotations).catch(console.error);
  }
}

export async function getUserProjects(email: string): Promise<StoredProject[]> {
  if (isSupabaseConfigured()) {
    try {
      const result = await dbGetUserProjects(email);
      if (result.length > 0) return result;
    } catch (e) { console.error("Supabase getUserProjects:", e); }
  }
  const all = _lsGetAll();
  return Object.values(all)
    .filter((p) => p.project.created_by === email)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// Local entries younger than this are treated as "not yet synced" and kept
// even when Supabase doesn't return them. Older ghosts get pruned — this is
// what lets a Supabase-side delete actually disappear from the UI instead of
// being re-injected from cache forever.
const LS_SYNC_GRACE_MS = 30_000;

function _isRecent(sp: StoredProject): boolean {
  return Date.now() - new Date(sp.updatedAt).getTime() < LS_SYNC_GRACE_MS;
}

export async function getPublicProjects(): Promise<StoredProject[]> {
  if (isSupabaseConfigured()) {
    try {
      const result = await dbGetPublicProjects();
      const supabaseIds = new Set(result.map((r) => r.project.id));
      const lsAll = _lsGetAll();
      let mutated = false;
      for (const [id, sp] of Object.entries(lsAll)) {
        const isPublic =
          sp.project.created_by !== "" && (sp.project.status ?? "receiving") === "receiving";
        if (!isPublic || supabaseIds.has(id)) continue;
        // Supabase doesn't know about this id. Prune stale ghosts; keep fresh unsynced writes.
        if (_isRecent(sp)) {
          result.push(sp);
        } else {
          delete lsAll[id];
          mutated = true;
        }
      }
      if (mutated) _lsSaveAll(lsAll);
      return result.sort((a, b) => b.project.created_at.localeCompare(a.project.created_at));
    } catch (e) { console.error("Supabase getPublicProjects:", e); }
  }
  const all = _lsGetAll();
  return Object.values(all)
    .filter((p) => p.project.created_by !== "" && (p.project.status ?? "receiving") === "receiving")
    .sort((a, b) => b.project.created_at.localeCompare(a.project.created_at));
}

export async function getCompletedProjects(): Promise<StoredProject[]> {
  if (isSupabaseConfigured()) {
    try {
      const result = await dbGetCompletedProjects();
      const supabaseIds = new Set(result.map((r) => r.project.id));
      const lsAll = _lsGetAll();
      let mutated = false;
      for (const [id, sp] of Object.entries(lsAll)) {
        const isCompleted = sp.project.created_by !== "" && sp.project.status === "completed";
        if (!isCompleted || supabaseIds.has(id)) continue;
        if (_isRecent(sp)) {
          result.push(sp);
        } else {
          delete lsAll[id];
          mutated = true;
        }
      }
      if (mutated) _lsSaveAll(lsAll);
      return result.sort((a, b) => {
        const aDate = a.project.completedAt ?? a.updatedAt;
        const bDate = b.project.completedAt ?? b.updatedAt;
        return bDate.localeCompare(aDate);
      });
    } catch (e) { console.error("Supabase getCompletedProjects:", e); }
  }
  const all = _lsGetAll();
  return Object.values(all)
    .filter((p) => p.project.created_by !== "" && p.project.status === "completed")
    .sort((a, b) => {
      const aDate = a.project.completedAt ?? a.updatedAt;
      const bDate = b.project.completedAt ?? b.updatedAt;
      return bDate.localeCompare(aDate);
    });
}

export async function deleteProject(id: string) {
  const all = _lsGetAll();
  delete all[id];
  _lsSaveAll(all);
  if (isSupabaseConfigured()) {
    await dbDeleteProject(id).catch(console.error);
  }
}

export function getProject(id: string): StoredProject | null {
  return _lsGetAll()[id] ?? null;
}

export function getOtherProjects(email: string): StoredProject[] {
  const all = _lsGetAll();
  return Object.values(all)
    .filter((p) => p.project.created_by !== email && p.project.created_by !== "")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ─── Reviews (legacy, localStorage only) ───

export function saveReview(review: Review, annotations: Annotation[]) {
  const all = getAllReviews();
  all[review.id] = { review, annotations, updatedAt: new Date().toISOString() };
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
}

export function getReview(id: string): StoredReview | null {
  return getAllReviews()[id] ?? null;
}

export function getAllReviews(): Record<string, StoredReview> {
  try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "{}"); }
  catch { return {}; }
}

export function getUserReviews(email: string): StoredReview[] {
  return Object.values(getAllReviews())
    .filter((r) => r.review.created_by === email)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteReview(id: string) {
  const all = getAllReviews();
  delete all[id];
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
}
