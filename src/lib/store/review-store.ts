import { create } from "zustand";
import type { Annotation, Project, ProjectStatus, RegionBounds, ReviewPage } from "@/types";

interface ReviewStore {
  // Project
  project: Project | null;
  setProject: (project: Project | null) => void;
  activePageId: string | null;
  setActivePageId: (id: string) => void;
  addPage: (page: ReviewPage) => void;
  removePage: (pageId: string) => void;

  // Annotations per page (keyed by pageId)
  pageAnnotations: Record<string, Annotation[]>;
  setPageAnnotations: (pageId: string, annotations: Annotation[]) => void;
  loadAllAnnotations: (all: Record<string, Annotation[]>) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  addReply: (annotationId: string, reply: import("@/types").AnnotationReply) => void;

  // Status
  updateProjectStatus: (status: ProjectStatus, appliedIds?: string[]) => void;
  setCompletedImage: (url: string) => void;

  // UI state
  isPinMode: boolean;
  setIsPinMode: (v: boolean) => void;
  selectedAnnotationId: string | null;
  setSelectedAnnotationId: (id: string | null) => void;
  pendingPin: { xPct: number; yPct: number; xPx: number; yPx: number } | null;
  setPendingPin: (
    pin: { xPct: number; yPct: number; xPx: number; yPx: number } | null
  ) => void;
  pendingRegion: RegionBounds | null;
  setPendingRegion: (region: RegionBounds | null) => void;
  draggingPinId: string | null;
  setDraggingPinId: (id: string | null) => void;

  reset: () => void;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  project: null,
  setProject: (project) => set({ project }),
  activePageId: null,
  setActivePageId: (id) =>
    set({
      activePageId: id,
      selectedAnnotationId: null,
      isPinMode: true,
      pendingPin: null,
      pendingRegion: null,
    }),
  addPage: (page) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: { ...s.project, pages: [...s.project.pages, page] },
      };
    }),
  removePage: (pageId) =>
    set((s) => {
      if (!s.project) return s;
      const newPages = s.project.pages.filter((p) => p.id !== pageId);
      const newAnnotations = { ...s.pageAnnotations };
      delete newAnnotations[pageId];
      return {
        project: { ...s.project, pages: newPages },
        pageAnnotations: newAnnotations,
        activePageId:
          s.activePageId === pageId
            ? newPages[0]?.id ?? null
            : s.activePageId,
      };
    }),

  pageAnnotations: {},
  setPageAnnotations: (pageId, annotations) =>
    set((s) => ({
      pageAnnotations: { ...s.pageAnnotations, [pageId]: annotations },
    })),
  loadAllAnnotations: (all) => set({ pageAnnotations: all }),

  // These operate on the active page
  addAnnotation: (annotation) =>
    set((s) => {
      const pid = s.activePageId;
      if (!pid) return s;
      return {
        pageAnnotations: {
          ...s.pageAnnotations,
          [pid]: [...(s.pageAnnotations[pid] || []), annotation],
        },
      };
    }),
  updateAnnotation: (id, updates) =>
    set((s) => {
      const pid = s.activePageId;
      if (!pid) return s;
      return {
        pageAnnotations: {
          ...s.pageAnnotations,
          [pid]: (s.pageAnnotations[pid] || []).map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        },
      };
    }),
  removeAnnotation: (id) =>
    set((s) => {
      const pid = s.activePageId;
      if (!pid) return s;
      return {
        pageAnnotations: {
          ...s.pageAnnotations,
          [pid]: (s.pageAnnotations[pid] || []).filter((a) => a.id !== id),
        },
        selectedAnnotationId:
          s.selectedAnnotationId === id ? null : s.selectedAnnotationId,
      };
    }),
  addReply: (annotationId, reply) =>
    set((s) => {
      const pid = s.activePageId;
      if (!pid) return s;
      return {
        pageAnnotations: {
          ...s.pageAnnotations,
          [pid]: (s.pageAnnotations[pid] || []).map((a) =>
            a.id === annotationId
              ? { ...a, replies: [...(a.replies || []), reply] }
              : a
          ),
        },
      };
    }),

  updateProjectStatus: (status, appliedIds) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: {
          ...s.project,
          status,
          ...(appliedIds ? { appliedCommentIds: [...(s.project.appliedCommentIds || []), ...appliedIds] } : {}),
          ...(status === "completed" ? { completedAt: new Date().toISOString() } : {}),
          updated_at: new Date().toISOString(),
        },
      };
    }),
  setCompletedImage: (url) =>
    set((s) => {
      if (!s.project) return s;
      return { project: { ...s.project, completedImageUrl: url } };
    }),

  isPinMode: false,
  setIsPinMode: (v) => set({ isPinMode: v }),
  selectedAnnotationId: null,
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),
  pendingPin: null,
  setPendingPin: (pin) => set({ pendingPin: pin }),
  pendingRegion: null,
  setPendingRegion: (region) => set({ pendingRegion: region }),
  draggingPinId: null,
  setDraggingPinId: (id) => set({ draggingPinId: id }),

  reset: () =>
    set({
      project: null,
      activePageId: null,
      pageAnnotations: {},
      isPinMode: false,
      selectedAnnotationId: null,
      pendingPin: null,
      pendingRegion: null,
      draggingPinId: null,
    }),
}));
