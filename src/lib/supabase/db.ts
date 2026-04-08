import { createClient, isSupabaseConfigured } from "./client";
import type { Annotation, AnnotationReply, Project } from "@/types";
import type { UserProfile, DesignerSpecialty } from "@/lib/profiles";

// ─── Projects ───

interface StoredProject {
  project: Project;
  annotations: Record<string, Annotation[]>;
  updatedAt: string;
}

export async function dbSaveProject(
  project: Project,
  annotations: Record<string, Annotation[]>
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();

  // Upsert project
  await supabase.from("projects").upsert({
    id: project.id,
    name: project.name,
    base_url: project.base_url,
    status: project.status ?? "receiving",
    applied_comment_ids: project.appliedCommentIds ?? [],
    completed_at: project.completedAt ?? null,
    completed_image_url: project.completedImageUrl ?? null,
    pages: project.pages,
    created_by: project.created_by,
    updated_at: new Date().toISOString(),
  });

  // Upsert annotations — flatten all pages
  for (const [pageId, anns] of Object.entries(annotations)) {
    for (const ann of anns) {
      await supabase.from("annotations").upsert({
        id: ann.id,
        project_id: project.id,
        page_id: pageId,
        pin_x_pct: ann.pin_x_pct,
        pin_y_pct: ann.pin_y_pct,
        pin_x_px: ann.pin_x_px,
        pin_y_px: ann.pin_y_px,
        region_bounds: ann.region_bounds,
        category: ann.category,
        severity: ann.severity,
        area_label: ann.area_label,
        comment: ann.comment,
        change_spec: ann.change_spec,
        author_name: ann.author_name,
        order_index: ann.order_index,
        image_urls: ann.image_urls ?? [],
      });

      // Upsert replies
      if (ann.replies?.length) {
        for (const reply of ann.replies) {
          await supabase.from("annotation_replies").upsert({
            id: reply.id,
            annotation_id: ann.id,
            comment: reply.comment,
            author_name: reply.author_name,
          });
        }
      }
    }
  }
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    base_url: row.base_url as string,
    status: (row.status as string) as Project["status"],
    appliedCommentIds: (row.applied_comment_ids as string[]) ?? [],
    completedAt: row.completed_at as string | undefined,
    completedImageUrl: row.completed_image_url as string | undefined,
    pages: (row.pages as Project["pages"]) ?? [],
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToAnnotation(row: Record<string, unknown>, replies: AnnotationReply[] = []): Annotation {
  return {
    id: row.id as string,
    review_id: row.project_id as string,
    pin_x_pct: row.pin_x_pct as number,
    pin_y_pct: row.pin_y_pct as number,
    pin_x_px: row.pin_x_px as number,
    pin_y_px: row.pin_y_px as number,
    region_bounds: row.region_bounds as Annotation["region_bounds"],
    category: row.category as Annotation["category"],
    severity: row.severity as Annotation["severity"],
    area_label: row.area_label as string,
    comment: row.comment as string,
    change_spec: row.change_spec as Annotation["change_spec"],
    author_name: row.author_name as string,
    created_at: row.created_at as string,
    order_index: row.order_index as number,
    image_urls: (row.image_urls as string[]) ?? [],
    replies,
  };
}

async function loadAnnotationsForProject(projectId: string): Promise<Record<string, Annotation[]>> {
  const supabase = createClient();
  const { data: annRows } = await supabase
    .from("annotations")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index");

  if (!annRows?.length) return {};

  // Load all replies for these annotations
  const annIds = annRows.map((a) => a.id);
  const { data: replyRows } = await supabase
    .from("annotation_replies")
    .select("*")
    .in("annotation_id", annIds)
    .order("created_at");

  const repliesByAnn: Record<string, AnnotationReply[]> = {};
  for (const r of replyRows ?? []) {
    if (!repliesByAnn[r.annotation_id]) repliesByAnn[r.annotation_id] = [];
    repliesByAnn[r.annotation_id].push({
      id: r.id,
      annotation_id: r.annotation_id,
      comment: r.comment,
      author_name: r.author_name,
      created_at: r.created_at,
    });
  }

  const byPage: Record<string, Annotation[]> = {};
  for (const row of annRows) {
    const pageId = row.page_id as string;
    if (!byPage[pageId]) byPage[pageId] = [];
    byPage[pageId].push(rowToAnnotation(row, repliesByAnn[row.id] ?? []));
  }
  return byPage;
}

export async function dbGetUserProjects(email: string): Promise<StoredProject[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();

  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("created_by", email)
    .order("updated_at", { ascending: false });

  if (!data?.length) return [];

  const results: StoredProject[] = [];
  for (const row of data) {
    const annotations = await loadAnnotationsForProject(row.id);
    results.push({
      project: rowToProject(row),
      annotations,
      updatedAt: row.updated_at,
    });
  }
  return results;
}

export async function dbGetPublicProjects(): Promise<StoredProject[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();

  const { data } = await supabase
    .from("projects")
    .select("*")
    .neq("created_by", "")
    .eq("status", "receiving")
    .order("created_at", { ascending: false });

  if (!data?.length) return [];

  const results: StoredProject[] = [];
  for (const row of data) {
    const annotations = await loadAnnotationsForProject(row.id);
    results.push({
      project: rowToProject(row),
      annotations,
      updatedAt: row.updated_at,
    });
  }
  return results;
}

export async function dbDeleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("projects").delete().eq("id", id);
}

// ─── Profiles ───

function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    email: row.email as string,
    name: row.name as string,
    specialty: row.specialty as DesignerSpecialty,
    bio: row.bio as string,
    experience: row.experience as string,
    linkedinUrl: row.linkedin_url as string | undefined,
    portfolioUrl: row.portfolio_url as string | undefined,
    isPrivate: row.is_private as boolean,
    stripeAccountId: row.stripe_account_id as string | undefined,
    stripeOnboarded: row.stripe_onboarded as boolean,
    ratings: [], // loaded separately
    createdAt: row.created_at as string,
  };
}

async function loadRatings(email: string): Promise<UserProfile["ratings"]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ratings")
    .select("*")
    .eq("target_email", email)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    from: r.from_email,
    score: r.score,
    comment: r.comment,
    createdAt: r.created_at,
  }));
}

export async function dbGetProfile(email: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (!data) return null;

  const profile = rowToProfile(data);
  profile.ratings = await loadRatings(email);
  return profile;
}

export async function dbSaveProfile(profile: UserProfile): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();

  await supabase.from("profiles").upsert({
    email: profile.email,
    name: profile.name,
    specialty: profile.specialty,
    bio: profile.bio,
    experience: profile.experience,
    linkedin_url: profile.linkedinUrl ?? null,
    portfolio_url: profile.portfolioUrl ?? null,
    is_private: profile.isPrivate ?? false,
    stripe_account_id: profile.stripeAccountId ?? null,
    stripe_onboarded: profile.stripeOnboarded ?? false,
  });
}

export async function dbGetAllProfiles(): Promise<UserProfile[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data?.length) return [];

  const profiles: UserProfile[] = [];
  for (const row of data) {
    const p = rowToProfile(row);
    p.ratings = await loadRatings(p.email);
    profiles.push(p);
  }
  return profiles;
}

export async function dbAddRating(
  targetEmail: string,
  from: string,
  score: number,
  comment: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();

  await supabase.from("ratings").insert({
    target_email: targetEmail,
    from_email: from,
    score,
    comment,
  });
}
