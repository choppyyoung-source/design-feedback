"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { ReviewCanvas } from "@/components/review/ReviewCanvas";
import { AnnotationPanel } from "@/components/review/AnnotationPanel";
import { PageSidebar } from "@/components/review/PageSidebar";
import { ExportPreview } from "@/components/export/ExportPreview";
import { AuthModal } from "@/components/auth/AuthModal";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { ProfileViewModal } from "@/components/profile/ProfileViewModal";
import { DesignerDirectory } from "@/components/profile/DesignerDirectory";
import { FeedbackRequestModal } from "@/components/payment/FeedbackRequestModal";
import { ReviewGrid } from "@/components/dashboard/ReviewGrid";
import { MyCommentsList } from "@/components/dashboard/MyCommentsList";
import { StatusBanner } from "@/components/review/StatusBanner";
import { BeforeAfterView } from "@/components/review/BeforeAfterView";
import { useReviewStore } from "@/lib/store/review-store";
import {
  saveProject,
  getUserProjects,
  getPublicProjects,
  getProject,
  deleteProject as deleteStoredProject,
  type StoredProject,
} from "@/lib/storage";
import { markProjectSeen } from "@/lib/notifications";
import type { Annotation, Project, Review, ReviewPage } from "@/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useT, LanguageToggle } from "@/lib/i18n";
import {
  MousePointerClick,
  FileOutput,
  Pin,
  ArrowLeft,
  LogOut,
  CheckCircle2,
  Upload,
  MessageCircle,
} from "lucide-react";

interface User {
  email: string;
  name: string;
}

export default function Home() {
  const t = useT();
  const store = useReviewStore();
  const {
    project,
    setProject,
    activePageId,
    setActivePageId,
    addPage,
    pageAnnotations,
    loadAllAnnotations,
    isPinMode,
    setIsPinMode,
    reset,
  } = store;

  const annotations = activePageId
    ? pageAnnotations[activePageId] || []
    : [];
  const activePage = project?.pages.find((p) => p.id === activePageId);

  const [showExport, setShowExport] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddPage, setShowAddPage] = useState(false);
  const [showMobileComments, setShowMobileComments] = useState(false);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [discoveredLinks, setDiscoveredLinks] = useState<
    { url: string; text: string; ogImage?: string | null }[]
  >([]);
  const [capturingPages, setCapturingPages] = useState<Set<string>>(new Set());
  const [dashboardTab, setDashboardTab] = useState<"requested" | "commented" | "directory" | "profile">("requested");
  const [viewProfileEmail, setViewProfileEmail] = useState<string | null>(null);
  const [requestingDesigner, setRequestingDesigner] = useState<string | null>(null);
  const [myProjects, setMyProjects] = useState<StoredProject[]>([]);
  const [publicProjects, setPublicProjects] = useState<StoredProject[]>([]);
  const [landingPath, setLandingPath] = useState<"give" | "receive" | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth: restore session + listen for changes
  useEffect(() => {
    const loadProjects = async (email: string | null) => {
      if (email) {
        const [my, pub] = await Promise.all([getUserProjects(email), getPublicProjects()]);
        setMyProjects(my);
        setPublicProjects(pub.filter((p) => p.project.created_by !== email));
      } else {
        setMyProjects([]);
        setPublicProjects(await getPublicProjects());
      }
    };

    if (!isSupabaseConfigured()) {
      try {
        const session = localStorage.getItem("dr_session");
        if (session) {
          const u = JSON.parse(session);
          setUser(u);
          loadProjects(u.email);
        } else {
          loadProjects(null);
        }
      } catch { /* ignore */ }
      setAuthLoading(false);
      return;
    }

    const supabase = createClient();

    const setUserFromSession = (session: { user: { email?: string; user_metadata?: Record<string, string> } } | null) => {
      if (session?.user) {
        const u: User = {
          email: session.user.email ?? "",
          name: session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "",
        };
        setUser(u);
        loadProjects(u.email);
      } else {
        setUser(null);
        loadProjects(null);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUserFromSession(session);
      setAuthLoading(false);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUserFromSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProjects = useCallback(
    async (email: string) => {
      const [my, pub] = await Promise.all([getUserProjects(email), getPublicProjects()]);
      setMyProjects(my);
      setPublicProjects(pub.filter((p) => p.project.created_by !== email));
    },
    []
  );

  const handleAuth = useCallback(
    (authedUser: User) => {
      setUser(authedUser);
      setShowAuth(false);
      // Claim ownership of current project if it has no owner
      if (project && !project.created_by) {
        const updated = { ...project, created_by: authedUser.email };
        setProject(updated);
        saveProject(updated, pageAnnotations);
      }
      refreshProjects(authedUser.email);
    },
    [project, pageAnnotations, setProject, refreshProjects]
  );

  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    localStorage.removeItem("dr_session");
    setUser(null);
    setMyProjects([]);
  }, []);

  // Create a new project from URL screenshot
  const handleUrlScreenshot = useCallback(
    (data: {
      imageDataUrl: string;
      width: number;
      height: number;
      sourceUrl: string;
      discoveredLinks?: { url: string; text: string; ogImage?: string | null }[];
    }) => {
      let hostname = "screenshot";
      try {
        hostname = new URL(data.sourceUrl).hostname.replace("www.", "");
      } catch {
        /* ignore */
      }

      const pageId = crypto.randomUUID();
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: hostname,
        base_url: data.sourceUrl,
        pages: [
          {
            id: pageId,
            title: hostname,
            url: data.sourceUrl,
            image_url: data.imageDataUrl,
            image_width: data.width,
            image_height: data.height,
          },
        ],
        created_by: user?.email ?? "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProject(newProject);
      setActivePageId(pageId);
      loadAllAnnotations({});
      setIsPinMode(true);
      setShowUpload(false);

      // Show discovered links if any
      if (data.discoveredLinks && data.discoveredLinks.length > 0) {
        setDiscoveredLinks(data.discoveredLinks);
        setShowPagePicker(true);
      }
    },
    [user, setProject, setActivePageId, loadAllAnnotations]
  );

  // Add a discovered page by capturing its screenshot
  const handleAddDiscoveredPage = useCallback(
    async (link: { url: string; text: string }) => {
      setCapturingPages((prev) => new Set(prev).add(link.url));
      try {
        const res = await fetch("/api/screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link.url }),
        });
        const data = await res.json();
        if (res.ok) {
          const page: ReviewPage = {
            id: crypto.randomUUID(),
            title: link.text,
            url: link.url,
            image_url: data.image,
            image_width: data.width,
            image_height: data.height,
          };
          addPage(page);
        }
      } catch {
        /* ignore */
      } finally {
        setCapturingPages((prev) => {
          const next = new Set(prev);
          next.delete(link.url);
          return next;
        });
      }
    },
    [addPage]
  );

  // Create a new project from uploaded image
  const handleImageSelected = useCallback(
    (file: File, previewUrl: string) => {
      const img = new Image();
      img.onload = () => {
        const pageId = crypto.randomUUID();
        const title = file.name.replace(/\.[^.]+$/, "");
        const newProject: Project = {
          id: crypto.randomUUID(),
          name: title,
          base_url: "",
          pages: [
            {
              id: pageId,
              title,
              url: "",
              image_url: previewUrl,
              image_width: img.naturalWidth,
              image_height: img.naturalHeight,
            },
          ],
          created_by: user?.email ?? "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProject(newProject);
        setActivePageId(pageId);
        loadAllAnnotations({});
        setIsPinMode(true);
        setShowUpload(false);
      };
      img.src = previewUrl;
    },
    [user, setProject, setActivePageId, loadAllAnnotations]
  );

  // Add a page (from upload dialog within project)
  const handleAddPageImage = useCallback(
    (file: File, previewUrl: string) => {
      const img = new Image();
      img.onload = () => {
        const page: ReviewPage = {
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^.]+$/, ""),
          url: "",
          image_url: previewUrl,
          image_width: img.naturalWidth,
          image_height: img.naturalHeight,
        };
        addPage(page);
        setActivePageId(page.id);
        setShowAddPage(false);
      };
      img.src = previewUrl;
    },
    [addPage, setActivePageId]
  );

  const handleAddPageUrl = useCallback(
    (data: {
      imageDataUrl: string;
      width: number;
      height: number;
      sourceUrl: string;
    }) => {
      let title = "page";
      try {
        const u = new URL(data.sourceUrl);
        title = u.pathname === "/" ? u.hostname : u.pathname.slice(1);
      } catch {
        /* ignore */
      }
      const page: ReviewPage = {
        id: crypto.randomUUID(),
        title,
        url: data.sourceUrl,
        image_url: data.imageDataUrl,
        image_width: data.width,
        image_height: data.height,
      };
      addPage(page);
      setActivePageId(page.id);
      setShowAddPage(false);
    },
    [addPage, setActivePageId]
  );

  // Save and go back to dashboard — reset UI immediately, save in background
  const handleSaveAndGoBack = useCallback(async () => {
    const savedProject = project;
    const savedAnnotations = pageAnnotations;
    const savedUser = user;

    // Reset UI immediately for snappy transition
    reset();
    setShowUpload(false);

    // Save & refresh in background
    if (savedProject && savedUser) {
      saveProject(savedProject, savedAnnotations).then(() => {
        const total = Object.values(savedAnnotations).flat().length;
        markProjectSeen(savedProject.id, total);
        refreshProjects(savedUser.email);
      });
    }
  }, [project, user, pageAnnotations, reset, refreshProjects]);

  // Open existing project from dashboard
  const handleSelectProject = useCallback(
    (
      p: Project,
      annots: Record<string, import("@/types").Annotation[]>
    ) => {
      setProject(p);
      loadAllAnnotations(annots);
      setIsPinMode(true);
      if (p.pages.length > 0) {
        setActivePageId(p.pages[0].id);
      }
      // Mark as seen
      const totalAnnotations = Object.values(annots).flat().length;
      markProjectSeen(p.id, totalAnnotations);
    },
    [setProject, loadAllAnnotations, setActivePageId]
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      await deleteStoredProject(id);
      if (user) await refreshProjects(user.email);
    },
    [user, refreshProjects]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => store.removeAnnotation(id),
    [store]
  );

  // Handle export used → transition to "applying"
  const handleExportUsed = useCallback(
    (selectedIds: string[]) => {
      if (!project) return;
      store.updateProjectStatus("applying", selectedIds);
      // Save immediately
      setTimeout(() => {
        const updatedProject = useReviewStore.getState().project;
        if (updatedProject && user) {
          saveProject(updatedProject, useReviewStore.getState().pageAnnotations);
          refreshProjects(user.email);
        }
      }, 0);
      setShowExport(false);
    },
    [project, user, store, refreshProjects]
  );

  // Handle "반영 완료" → open before/after dialog
  const handleMarkCompleted = useCallback(() => {
    setShowComplete(true);
  }, []);

  // Actually complete with after image
  const handleAfterImageSet = useCallback(
    (imageDataUrl: string) => {
      if (!project) return;
      store.setCompletedImage(imageDataUrl);
      store.updateProjectStatus("completed");
      setTimeout(() => {
        const updatedProject = useReviewStore.getState().project;
        if (updatedProject && user) {
          saveProject(updatedProject, useReviewStore.getState().pageAnnotations);
          refreshProjects(user.email);
        }
      }, 0);
    },
    [project, user, store, refreshProjects]
  );

  // Handle "다시 피드백 받기" → reset to "receiving"
  const handleResetToReceiving = useCallback(() => {
    if (!project) return;
    store.updateProjectStatus("receiving");
    setTimeout(() => {
      const updatedProject = useReviewStore.getState().project;
      if (updatedProject && user) {
        saveProject(updatedProject, useReviewStore.getState().pageAnnotations);
        refreshProjects(user.email);
      }
    }, 0);
  }, [project, user, store, refreshProjects]);

  // Build a Review object for ExportPreview (legacy compat)
  const reviewForExport: Review | null =
    project && activePage
      ? {
          id: project.id,
          title: `${project.name} — ${activePage.title}`,
          image_url: activePage.image_url,
          image_width: activePage.image_width,
          image_height: activePage.image_height,
          design_context: project.base_url
            ? { description: `Source: ${project.base_url}` }
            : null,
          share_token: "",
          created_by: project.created_by,
          created_at: project.created_at,
          updated_at: project.updated_at,
        }
      : null;

  // ==================== RENDER ====================

  // No project open → show dashboard or upload
  if (!project) {
    // Wait for auth to resolve before deciding landing vs dashboard
    // (prevents landing page flash when user is already logged in)
    if (authLoading) {
      return (
        <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-[rgba(0,0,0,0.1)] border-t-[rgba(0,0,0,0.6)] animate-spin" />
        </div>
      );
    }

    // Dashboard if logged in with projects
    if (user && (myProjects.length > 0 || dashboardTab !== "requested") && !showUpload && !landingPath) {
      const reviewItems = myProjects.map((sp) => ({
        review: {
          id: sp.project.id,
          title: sp.project.name,
          image_url: sp.project.pages[0]?.image_url ?? "",
          image_width: sp.project.pages[0]?.image_width ?? 0,
          image_height: sp.project.pages[0]?.image_height ?? 0,
          design_context: null,
          share_token: "",
          created_by: sp.project.created_by,
          created_at: sp.project.created_at,
          updated_at: sp.project.updated_at,
        },
        annotations: Object.values(sp.annotations).flat(),
        updatedAt: sp.updatedAt,
        status: sp.project.status,
      }));

      // My individual comments across all projects (exclude my own questions on my own projects)
      const myComments = myProjects.flatMap((sp) =>
        Object.entries(sp.annotations).flatMap(([pageId, annotations]) =>
          (annotations as Annotation[])
            .filter((a) => a.author_name === user.email && sp.project.created_by !== user.email)
            .map((a) => ({
              annotation: a,
              projectName: sp.project.name,
              pageName: sp.project.pages.find((p) => p.id === pageId)?.title ?? "",
              projectId: sp.project.id,
              imageUrl: sp.project.pages.find((p) => p.id === pageId)?.image_url ?? sp.project.pages[0]?.image_url,
              ownerEmail: sp.project.created_by,
              projectStatus: sp.project.status,
            }))
        )
      ).sort((a, b) => b.annotation.created_at.localeCompare(a.annotation.created_at));

      return (
        <div className="flex-1 bg-background min-h-screen">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-[rgba(0,0,0,0.08)]">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex items-center justify-between h-14">
                <h1
                  className="text-sm font-bold tracking-tight cursor-pointer"
                  onClick={() => {
                    setProject(null);
                    setLandingPath(null);
                    setShowUpload(false);
                    setDashboardTab("requested");
                  }}
                >
                  Design Feedback
                </h1>
                <button
                  className="text-[13px] text-[#615d59] hover:text-foreground transition-colors"
                  onClick={handleLogout}
                >
                  {t("auth.logout")}
                </button>
              </div>
              {/* Tabs */}
              <div className="flex items-center gap-1 -mb-px">
                {([
                  { key: "requested", label: t("dashboard.requestFeedback") },
                  { key: "commented", label: t("dashboard.giveFeedback") },
                  { key: "profile", label: t("dashboard.myProfile") },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    className={`px-3 py-2 text-[13px] font-medium rounded-t-lg transition-colors ${
                      dashboardTab === tab.key
                        ? "text-foreground bg-[#f6f5f4]"
                        : "text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4]"
                    }`}
                    onClick={() => { setDashboardTab(tab.key); setViewProfileEmail(null); }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-5xl mx-auto px-6 py-6">
            {/* Tab content */}
            {dashboardTab === "requested" && (
              <div className="space-y-4">
                {/* Designer directory banner */}
                <button
                  className="inline-flex items-center gap-2.5 px-1.5 py-1.5 pr-5 rounded-full bg-gradient-to-r from-white via-white/90 to-white/70 backdrop-blur-xl border border-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all text-left group hover:-translate-y-px"
                  onClick={() => { setDashboardTab("directory" as never); setViewProfileEmail(null); }}
                >
                  <span className="px-3 py-1 rounded-full text-white text-xs font-semibold bg-[length:200%_200%] animate-[gradient-shift_3s_ease_infinite] bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500">{t("dashboard.findDesigner")}</span>
                  <span className="text-[13px] text-[#615d59]">{t("dashboard.findDesignerDesc")}</span>
                  <span className="text-sm text-[#615d59] group-hover:text-foreground group-hover:translate-x-0.5 transition-all ml-1">→</span>
                </button>

                <ReviewGrid
                  reviews={reviewItems}
                  onSelect={(r) => {
                    const item = myProjects.find((sp) => sp.project.id === r.id);
                    if (item) handleSelectProject(item.project, item.annotations);
                  }}
                  onDelete={handleDeleteProject}
                  onNew={() => setShowUpload(true)}
                  emptyMessage={t("dashboard.noRequestedReviews")}
                  emptyDescription={t("dashboard.getDesignReview")}
                />
              </div>
            )}

            {dashboardTab === "commented" && (
              <MyCommentsList
                comments={myComments}
                onSelectProject={(projectId) => {
                  const item = myProjects.find((sp) => sp.project.id === projectId);
                  if (item) handleSelectProject(item.project, item.annotations);
                }}
                publicProjects={publicProjects.map((sp) => ({
                  review: {
                    id: sp.project.id,
                    title: sp.project.name,
                    image_url: sp.project.pages[0]?.image_url ?? "",
                    image_width: sp.project.pages[0]?.image_width ?? 0,
                    image_height: sp.project.pages[0]?.image_height ?? 0,
                    design_context: null,
                    share_token: "",
                    created_by: sp.project.created_by,
                    created_at: sp.project.created_at,
                    updated_at: sp.project.updated_at,
                  },
                  annotations: Object.values(sp.annotations).flat(),
                  updatedAt: sp.updatedAt,
                  status: sp.project.status,
                }))}
                onSelectPublicProject={(r) => {
                  const item = publicProjects.find((sp) => sp.project.id === r.id);
                  if (item) handleSelectProject(item.project, item.annotations);
                }}
              />
            )}

            {dashboardTab === "profile" && (
              <ProfileSection
                email={user.email}
                currentUserEmail={user.email}
                contribution={(() => {
                  let totalComments = 0;
                  let appliedComments = 0;
                  const feedbackItems: { id: string; comment: string; severity: string; projectName: string; createdAt: string; isApplied: boolean }[] = [];
                  const feedbackProjectMap = new Map<string, { id: string; name: string; feedbackCount: number; imageUrl?: string }>();
                  const requestedProjects: { id: string; name: string; feedbackCount: number; imageUrl?: string }[] = [];
                  // myProjects = 내가 만든 프로젝트, publicProjects = 남이 만든 공개 프로젝트
                  // 내 코멘트는 publicProjects 쪽에 있어서 둘 다 훑어야 함
                  const allProjectsForStats = [...myProjects, ...publicProjects];
                  allProjectsForStats.forEach((sp) => {
                    const isOwner = sp.project.created_by === user.email;
                    const allAnnotations = Object.values(sp.annotations).flat() as Annotation[];
                    if (isOwner) {
                      // My own project — count as "requested" project
                      const othersCount = allAnnotations.filter((a) => a.author_name !== user.email).length;
                      const firstPage = sp.project.pages?.[0];
                      requestedProjects.push({
                        id: sp.project.id,
                        name: sp.project.name,
                        feedbackCount: othersCount,
                        imageUrl: firstPage?.image_url,
                      });
                    } else {
                      // Others' project — count my feedback
                      const myAnns = allAnnotations.filter((a) => a.author_name === user.email);
                      const applied = sp.project.appliedCommentIds || [];
                      if (myAnns.length > 0) {
                        const firstPage = sp.project.pages?.[0];
                        feedbackProjectMap.set(sp.project.id, {
                          id: sp.project.id,
                          name: sp.project.name,
                          feedbackCount: myAnns.length,
                          imageUrl: firstPage?.image_url,
                        });
                      }
                      myAnns.forEach((a) => {
                        const isApplied = applied.includes(a.id);
                        feedbackItems.push({
                          id: a.id,
                          comment: a.comment,
                          severity: a.severity,
                          projectName: sp.project.name,
                          createdAt: a.created_at,
                          isApplied,
                        });
                        totalComments++;
                        if (isApplied) appliedComments++;
                      });
                    }
                  });
                  return {
                    totalComments,
                    appliedComments,
                    projectCount: feedbackProjectMap.size + requestedProjects.length,
                    feedbackItems,
                    feedbackProjects: Array.from(feedbackProjectMap.values()),
                    requestedProjects,
                  };
                })()}
              />
            )}

            {dashboardTab === "directory" && !viewProfileEmail && (
              <DesignerDirectory
                onSelectProfile={(email) => setViewProfileEmail(email)}
                onRequestFeedback={(designerEmail) => setRequestingDesigner(designerEmail)}
                onBack={() => setDashboardTab("requested")}
                currentUserEmail={user.email}
              />
            )}

            {dashboardTab === "directory" && viewProfileEmail && (
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4] transition-colors flex-shrink-0"
                    onClick={() => setViewProfileEmail(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[13px] text-[#615d59]">{t("dashboard.designerList")}</span>
                </div>
                <ProfileSection
                  email={viewProfileEmail}
                  currentUserEmail={user.email}
                  contribution={(() => {
                    let totalComments = 0;
                    let appliedComments = 0;
                    const feedbackItems: { id: string; comment: string; severity: string; projectName: string; createdAt: string; isApplied: boolean }[] = [];
                    const feedbackProjectMap = new Map<string, { id: string; name: string; feedbackCount: number; imageUrl?: string }>();
                    const requestedProjects: { id: string; name: string; feedbackCount: number; imageUrl?: string }[] = [];
                    // 이 디자이너가 만든 프로젝트는 publicProjects에, 내가 만든 프로젝트에 이 디자이너가 남긴 코멘트는 myProjects에
                    const allProjectsForStats = [...myProjects, ...publicProjects];
                    allProjectsForStats.forEach((sp) => {
                      const isOwner = sp.project.created_by === viewProfileEmail;
                      const allAnnotations = Object.values(sp.annotations).flat() as Annotation[];
                      if (isOwner) {
                        const othersCount = allAnnotations.filter((a) => a.author_name !== viewProfileEmail).length;
                        const firstPage = sp.project.pages?.[0];
                        requestedProjects.push({
                          id: sp.project.id,
                          name: sp.project.name,
                          feedbackCount: othersCount,
                          imageUrl: firstPage?.image_url,
                        });
                      } else {
                        const anns = allAnnotations.filter((a) => a.author_name === viewProfileEmail);
                        const applied = sp.project.appliedCommentIds || [];
                        if (anns.length > 0) {
                          const firstPage = sp.project.pages?.[0];
                          feedbackProjectMap.set(sp.project.id, {
                            id: sp.project.id,
                            name: sp.project.name,
                            feedbackCount: anns.length,
                            imageUrl: firstPage?.image_url,
                          });
                        }
                        anns.forEach((a) => {
                          const isApplied = applied.includes(a.id);
                          feedbackItems.push({
                            id: a.id,
                            comment: a.comment,
                            severity: a.severity,
                            projectName: sp.project.name,
                            createdAt: a.created_at,
                            isApplied,
                          });
                          totalComments++;
                          if (isApplied) appliedComments++;
                        });
                      }
                    });
                    return {
                      totalComments,
                      appliedComments,
                      projectCount: feedbackProjectMap.size + requestedProjects.length,
                      feedbackItems,
                      feedbackProjects: Array.from(feedbackProjectMap.values()),
                      requestedProjects,
                    };
                  })()}
                />
              </div>
            )}
          </div>

          <AuthModal open={showAuth} onOpenChange={setShowAuth} onAuth={handleAuth} />
          {requestingDesigner && (
            <FeedbackRequestModal
              open={!!requestingDesigner}
              onOpenChange={(open) => { if (!open) setRequestingDesigner(null); }}
              designerEmail={requestingDesigner}
              currentUserEmail={user.email}
            />
          )}
        </div>
      );
    }

    // Upload screen (from dashboard "새 링크 올리기")
    if (showUpload) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-6">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2.5 mb-6">
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4] transition-colors flex-shrink-0"
                onClick={() => setShowUpload(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="text-[14px] font-semibold">{t("dashboard.newProject")}</h2>
            </div>
            <ImageUploader
              onImageSelected={handleImageSelected}
              onUrlScreenshot={handleUrlScreenshot}
            />
          </div>
          <AuthModal
            open={showAuth}
            onOpenChange={setShowAuth}
            onAuth={handleAuth}
          />
        </div>
      );
    }

    // Landing: two-path selection or specific path content
    if (!landingPath) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-16">
          <div className="w-full mx-auto" style={{ maxWidth: "460px" }}>
            {/* Hero */}
            <div className="text-center mb-12">
              <h1 className="text-[2.5rem] font-bold tracking-[-0.04em] leading-[1.05] mb-4">
                Design Feedback
              </h1>
              <p className="text-lg text-[#615d59] leading-relaxed whitespace-pre-line">
                {t("landing.subtitle")}
              </p>
            </div>

            {/* CTA cards */}
            <div className="space-y-3">
              <button
                className="w-full rounded-md border border-[rgba(0,0,0,0.1)] bg-white px-6 py-5 text-left shadow-notion hover:shadow-notion-lg transition-shadow group"
                onClick={() => setLandingPath("receive")}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-[#f2f9ff] flex items-center justify-center flex-shrink-0">
                    <Upload className="h-5 w-5 text-[#0075de]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-[rgba(0,0,0,0.95)]">{t("landing.receiveFeedback")}</p>
                    <p className="text-[14px] text-[#615d59] mt-0.5">
                      {t("landing.receiveFeedbackDesc")}
                    </p>
                  </div>
                  <span className="text-[#a39e98] group-hover:text-[#0075de] transition-colors">→</span>
                </div>
              </button>
              <button
                className="w-full rounded-md border border-[rgba(0,0,0,0.1)] bg-white px-6 py-5 text-left shadow-notion hover:shadow-notion-lg transition-shadow group"
                onClick={() => setLandingPath("give")}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-[#f6f5f4] flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-5 w-5 text-[#31302e]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-[rgba(0,0,0,0.95)]">{t("landing.giveFeedback")}</p>
                    <p className="text-[14px] text-[#615d59] mt-0.5">
                      {t("landing.giveFeedbackDesc")}
                    </p>
                  </div>
                  <span className="text-[#a39e98] group-hover:text-[#0075de] transition-colors">→</span>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-10 text-center space-y-3">
              {user ? (
                <div className="flex items-center justify-center gap-2 text-[14px] text-[#a39e98]">
                  <span>{user.email}</span>
                  <span>·</span>
                  <button
                    className="text-[#615d59] hover:text-[rgba(0,0,0,0.95)] transition-colors"
                    onClick={handleLogout}
                  >
                    {t("auth.logout")}
                  </button>
                </div>
              ) : (
                <button
                  className="text-[14px] text-[#a39e98] hover:text-[rgba(0,0,0,0.95)] transition-colors"
                  onClick={() => setShowAuth(true)}
                >
                  {t("landing.alreadyHaveAccount")} <span className="text-[#0075de] font-medium">{t("auth.login")}</span>
                </button>
              )}
              <div className="flex justify-center">
                <LanguageToggle />
              </div>
            </div>
          </div>
          <AuthModal
            open={showAuth}
            onOpenChange={setShowAuth}
            onAuth={handleAuth}
          />
        </div>
      );
    }

    // "피드백 남기기" path — browse public projects
    if (landingPath === "give") {
      const exploreItems = publicProjects.map((sp) => ({
        review: {
          id: sp.project.id,
          title: sp.project.name,
          image_url: sp.project.pages[0]?.image_url ?? "",
          image_width: sp.project.pages[0]?.image_width ?? 0,
          image_height: sp.project.pages[0]?.image_height ?? 0,
          design_context: null,
          share_token: "",
          created_by: sp.project.created_by,
          created_at: sp.project.created_at,
          updated_at: sp.project.updated_at,
        },
        annotations: Object.values(sp.annotations).flat(),
        updatedAt: sp.updatedAt,
        status: sp.project.status,
      }));

      return (
        <div className="flex-1 bg-background min-h-screen">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-[rgba(0,0,0,0.08)]">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex items-center h-14 gap-2.5">
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4] transition-colors flex-shrink-0"
                  onClick={() => setLandingPath(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="text-[14px] font-semibold tracking-tight">{t("landing.projectsNeedingFeedback")}</h1>
              </div>
            </div>
          </div>
          <div className="max-w-5xl mx-auto px-6 py-6">
            <ReviewGrid
              reviews={exploreItems}
              onSelect={(r) => {
                if (!user) {
                  setShowAuth(true);
                  return;
                }
                const item = publicProjects.find((sp) => sp.project.id === r.id);
                if (item) handleSelectProject(item.project, item.annotations);
              }}
              onDelete={() => {}}
              onNew={() => {}}
              emptyMessage={t("landing.noProjectsNeedingFeedback")}
              emptyDescription={t("landing.pleaseWait")}
              showDelete={false}
              hideNewButton
              showAuthor
            />
          </div>
          <AuthModal
            open={showAuth}
            onOpenChange={setShowAuth}
            onAuth={(authedUser) => {
              handleAuth(authedUser);
              getPublicProjects().then((ps) => setPublicProjects(ps.filter((p) => p.project.created_by !== authedUser.email)));
            }}
          />
        </div>
      );
    }

    // "피드백 받기" path — upload flow
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-6">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4] transition-colors flex-shrink-0"
              onClick={() => setLandingPath(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[14px] font-semibold">{t("landing.receiveFeedback")}</h2>
          </div>
          <ImageUploader
            onImageSelected={handleImageSelected}
            onUrlScreenshot={handleUrlScreenshot}
          />
          <div className="mt-6">
            {user ? (
              <div className="flex items-center justify-center gap-1.5 text-[13px] text-[#615d59]">
                <span>{user.email}</span>
                <span className="text-[#615d59]">·</span>
                <button
                  className="hover:text-foreground transition-colors underline underline-offset-2 decoration-muted-foreground/20"
                  onClick={handleLogout}
                >
                  {t("auth.logout")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Button
                  className="w-full h-11 bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.95)]/90 text-background font-semibold text-[13px]"
                  onClick={() => setShowAuth(true)}
                >
                  {t("landing.loginAndStart")}
                </Button>
                <button
                  className="text-[13px] text-[#615d59] hover:text-foreground transition-colors"
                  onClick={() => setShowAuth(true)}
                >
                  {t("landing.alreadyHaveAccount")} <span className="underline underline-offset-2 decoration-muted-foreground/20">{t("auth.login")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <AuthModal
          open={showAuth}
          onOpenChange={setShowAuth}
          onAuth={handleAuth}
        />
      </div>
    );
  }

  // ==================== PROJECT VIEW ====================
  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[rgba(0,0,0,0.1)] bg-background gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4] transition-colors flex-shrink-0"
            onClick={handleSaveAndGoBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold truncate max-w-[120px] sm:max-w-[200px]">
            {project.name}
          </h1>
          {activePage && (
            <span className="hidden sm:contents">
              <span className="text-[#615d59]">/</span>
              <a
                href={activePage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#615d59] hover:text-foreground hover:underline transition-colors truncate max-w-[150px]"
                onClick={(e) => e.stopPropagation()}
              >
                {activePage.title}
              </a>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {(!project.status || project.status === "receiving") && user?.email === project.created_by && (
            <Button
              size="sm"
              onClick={() => setShowExport(true)}
              disabled={annotations.length === 0}
              className="bg-[rgba(0,0,0,0.95)] text-background hover:bg-[rgba(0,0,0,0.95)]/90"
            >
              <FileOutput className="h-4 w-4 mr-1.5" />
              {t("export.title")}
            </Button>
          )}
          {project.status === "applying" && user?.email === project.created_by && (
            <Button
              size="sm"
              onClick={handleMarkCompleted}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {t("export.markCompleted")}
            </Button>
          )}
          {project.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComplete(true)}
            >
              {t("export.beforeAfter")}
            </Button>
          )}
          {project.status === "completed" && user?.email === project.created_by && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToReceiving}
            >
              {t("export.resetToReceiving")}
            </Button>
          )}
        </div>
      </div>

      {/* Main content: Page sidebar + Canvas + Comment sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Page sidebar */}
        <PageSidebar
          pages={project.pages}
          activePageId={activePageId ?? ""}
          annotationCounts={Object.fromEntries(
            Object.entries(pageAnnotations).map(([k, v]) => [k, v.length])
          )}
          onSelectPage={setActivePageId}
          onDeletePage={store.removePage}
          onAddPage={() => setShowAddPage(true)}
          isOwner={user?.email === project.created_by}
        />

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          {activePage && (
            <ReviewCanvas
              pageId={activePage.id}
              imageUrl={activePage.image_url}
              imageWidth={activePage.image_width}
              imageHeight={activePage.image_height}
              authorName={user?.email ?? "Anonymous"}
              isOwner={user?.email === project.created_by}
              isLoggedIn={!!user}
              onLoginClick={() => setShowAuth(true)}
              projectStatus={project.status ?? "receiving"}
            />
          )}
        </div>

        {/* Mobile toggle for comment sidebar */}
        <button
          className="md:hidden fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-[rgba(0,0,0,0.95)] text-white flex items-center justify-center shadow-lg"
          onClick={() => setShowMobileComments(!showMobileComments)}
        >
          <MessageCircle className="h-5 w-5" />
          {annotations.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
              {annotations.length}
            </span>
          )}
        </button>

        {/* Comment sidebar */}
        <div className={`
          fixed md:relative inset-0 md:inset-auto z-20 md:z-auto
          w-full md:w-80 border-l bg-background flex flex-col
          transition-transform duration-200
          ${showMobileComments ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}>
          <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">{t("review.feedback")}</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#615d59]">{annotations.length}</span>
                <button
                  className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4] transition-colors"
                  onClick={() => setShowMobileComments(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
            {project.status === "applying" && (
              <p className="text-sm text-amber-600 mt-1">{t("review.applyingFeedback")}</p>
            )}
            {project.status === "completed" && (
              <p className="text-sm text-emerald-600 mt-1">{t("review.updateComplete")}</p>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <AnnotationPanel
              onDelete={handleDeleteAnnotation}
              onLoginClick={() => setShowAuth(true)}
              currentUserEmail={user?.email}
              ownerEmail={project.created_by}
              onProfileClick={(email) => setViewProfileEmail(email)}
              projectDescription={activePage?.description}
              onDescriptionChange={(desc) => {
                if (!activePage) return;
                const updatedPages = project.pages.map((p) =>
                  p.id === activePage.id ? { ...p, description: desc } : p
                );
                setProject({ ...project, pages: updatedPages });
              }}
            />
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {reviewForExport && (
        <Dialog open={showExport} onOpenChange={setShowExport}>
          <DialogContent className="sm:!max-w-4xl !max-w-[90vw] h-[80vh] flex flex-col !p-0 !gap-0 overflow-hidden">
            <DialogHeader className="px-5 py-3 border-b">
              <DialogTitle>{t("export.title")}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden min-h-0">
              <ExportPreview
                review={reviewForExport}
                annotations={annotations.filter((a) => a.author_name !== project.created_by)}
                onExportUsed={handleExportUsed}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Before/After Dialog */}
      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent className="sm:!max-w-2xl !max-w-[90vw] !p-0 !gap-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b">
            <DialogTitle>
              {project.completedImageUrl ? "Before / After" : t("export.markCompleted")}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[75vh]">
            <BeforeAfterView
              beforeImageUrl={activePage?.image_url ?? project.pages[0]?.image_url ?? ""}
              afterImageUrl={project.completedImageUrl}
              projectName={project.name}
              appliedAnnotations={(() => {
                const appliedIds = new Set(project.appliedCommentIds ?? []);
                if (appliedIds.size === 0) return [];
                return Object.values(pageAnnotations)
                  .flat()
                  .filter((a) => appliedIds.has(a.id));
              })()}
              onCaptureAfter={(img) => {
                handleAfterImageSet(img);
              }}
              onUploadAfter={(img) => {
                handleAfterImageSet(img);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Page Dialog */}
      <Dialog open={showAddPage} onOpenChange={setShowAddPage}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("review.addPage")}</DialogTitle>
          </DialogHeader>
          <ImageUploader
            onImageSelected={handleAddPageImage}
            onUrlScreenshot={handleAddPageUrl}
          />
        </DialogContent>
      </Dialog>

      {/* Discovered Pages Picker */}
      <Dialog open={showPagePicker} onOpenChange={setShowPagePicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("review.discoveredPages")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#615d59]">
            {t("review.discoveredPagesDesc").replace("{count}", String(discoveredLinks.length))}
          </p>
          <div className="max-h-72 overflow-auto space-y-2 mt-2">
              {discoveredLinks.map((link, i) => {
                const alreadyAdded = project?.pages.some(
                  (p) => p.url === link.url
                );
                const isCapturing = capturingPages.has(link.url);
                return (
                  <div
                    key={link.url}
                    className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                      alreadyAdded
                        ? "bg-primary/5 border border-primary/20"
                        : "border border-[rgba(0,0,0,0.1)] hover:border-[rgba(0,0,0,0.1)]"
                    }`}
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#f6f5f4]flex items-center justify-center text-xs font-medium text-[#615d59]">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {link.text}
                      </p>
                      <p className="text-[13px] text-[#615d59] truncate">
                        {new URL(link.url).pathname}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={alreadyAdded ? "secondary" : "outline"}
                      disabled={alreadyAdded || isCapturing}
                      onClick={() => handleAddDiscoveredPage(link)}
                      className="flex-shrink-0 h-8 text-xs"
                    >
                      {isCapturing
                        ? t("review.capturing")
                        : alreadyAdded
                          ? t("review.added")
                          : t("review.add")}
                    </Button>
                  </div>
                );
              })}
            </div>
          <Button
            className="w-full mt-2"
            onClick={() => setShowPagePicker(false)}
          >
            {t("review.done")}
          </Button>
        </DialogContent>
      </Dialog>

      <AuthModal
        open={showAuth}
        onOpenChange={setShowAuth}
        onAuth={handleAuth}
      />

      {/* Profile modal */}
      {viewProfileEmail && (() => {
        // Calculate contribution stats for viewed profile
        const allStoredProjects = [...(myProjects as StoredProject[]), ...(publicProjects as StoredProject[])];
        const seen = new Set<string>();
        let totalComments = 0;
        let appliedComments = 0;
        let projectCount = 0;
        for (const sp of allStoredProjects) {
          if (seen.has(sp.project.id)) continue;
          seen.add(sp.project.id);
          const anns = Object.values(sp.annotations).flat().filter(a => a.author_name === viewProfileEmail);
          if (anns.length > 0) {
            totalComments += anns.length;
            appliedComments += anns.filter(a => (a as { applied?: boolean }).applied).length;
            projectCount++;
          }
        }
        return (
          <ProfileViewModal
            open={!!viewProfileEmail}
            onOpenChange={(open) => { if (!open) setViewProfileEmail(null); }}
            email={viewProfileEmail}
            currentUserEmail={user?.email}
            contribution={{ totalComments, appliedComments, projectCount }}
          />
        );
      })()}
    </div>
  );
}
