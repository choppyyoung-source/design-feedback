"use client";

import { useState, useCallback } from "react";
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
import { ReviewGrid } from "@/components/dashboard/ReviewGrid";
import { MyCommentsList } from "@/components/dashboard/MyCommentsList";
import { StatusBanner } from "@/components/review/StatusBanner";
import { BeforeAfterView } from "@/components/review/BeforeAfterView";
import { useReviewStore } from "@/lib/store/review-store";
import {
  saveProject,
  getUserProjects,
  deleteProject as deleteStoredProject,
} from "@/lib/storage";
import { markProjectSeen } from "@/lib/notifications";
import type { Annotation, Project, Review, ReviewPage } from "@/types";
import {
  MousePointerClick,
  FileOutput,
  Pin,
  ArrowLeft,
  LogOut,
  CheckCircle2,
  Upload,
} from "lucide-react";

interface User {
  email: string;
  name: string;
}

export default function Home() {
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
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [discoveredLinks, setDiscoveredLinks] = useState<
    { url: string; text: string; ogImage?: string | null }[]
  >([]);
  const [capturingPages, setCapturingPages] = useState<Set<string>>(new Set());
  const [dashboardTab, setDashboardTab] = useState<"requested" | "commented" | "explore" | "directory" | "profile">("requested");
  const [showExplore, setShowExplore] = useState(false);
  const [viewProfileEmail, setViewProfileEmail] = useState<string | null>(null);
  const [myProjects, setMyProjects] = useState<
    ReturnType<typeof getUserProjects>
  >([]);
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const session = localStorage.getItem("dr_session");
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  });

  // Load projects on mount
  useState(() => {
    if (typeof window !== "undefined") {
      try {
        const session = localStorage.getItem("dr_session");
        if (session) {
          const u = JSON.parse(session);
          setTimeout(() => setMyProjects(getUserProjects(u.email)), 0);
        }
      } catch {
        /* ignore */
      }
    }
    return true;
  });

  const refreshProjects = useCallback(
    (email: string) => setMyProjects(getUserProjects(email)),
    []
  );

  const handleAuth = useCallback(
    (authedUser: User) => {
      setUser(authedUser);
      setShowAuth(false);
      refreshProjects(authedUser.email);
      if (project) {
        setProject({ ...project, created_by: authedUser.email });
      }
    },
    [project, setProject, refreshProjects]
  );

  const handleLogout = useCallback(() => {
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

  // Save and go back to dashboard
  const handleSaveAndGoBack = useCallback(() => {
    if (project && user) {
      saveProject(project, pageAnnotations);
      const total = Object.values(pageAnnotations).flat().length;
      markProjectSeen(project.id, total);
      refreshProjects(user.email);
    }
    reset();
    setShowUpload(false);
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
    (id: string) => {
      deleteStoredProject(id);
      if (user) refreshProjects(user.email);
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
    // Dashboard if logged in with projects
    if (user && (myProjects.length > 0 || dashboardTab !== "requested") && !showUpload) {
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
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex items-center justify-between h-14">
                <h1 className="text-base font-bold tracking-tight cursor-pointer" onClick={() => window.location.reload()}>Design Feedback</h1>
                <button
                  className="text-[11px] px-2.5 py-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
              {/* Tabs */}
              <div className="flex items-center gap-1 -mb-px">
                {([
                  { key: "requested", label: "피드백 요청하기" },
                  { key: "commented", label: "피드백 남기기" },
                  { key: "profile", label: "내 프로필" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                      dashboardTab === tab.key
                        ? "text-foreground bg-muted/40"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20"
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
                  <span className="px-3 py-1 rounded-full text-white text-xs font-semibold bg-[length:200%_200%] animate-[gradient-shift_3s_ease_infinite] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">디자이너 찾기</span>
                  <span className="text-[13px] text-muted-foreground">피드백 받고싶은 디자이너를 찾아보세요</span>
                  <span className="text-sm text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all ml-1">→</span>
                </button>

                <ReviewGrid
                  reviews={reviewItems}
                  onSelect={(r) => {
                    const item = myProjects.find((sp) => sp.project.id === r.id);
                    if (item) handleSelectProject(item.project, item.annotations);
                  }}
                  onDelete={handleDeleteProject}
                  onNew={() => setShowUpload(true)}
                  emptyMessage="아직 요청한 리뷰가 없어요"
                  emptyDescription="디자인 리뷰를 받아보세요"
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
                onExplore={() => { setDashboardTab("explore"); setShowExplore(true); }}
              />
            )}

            {dashboardTab === "explore" && (
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0"
                    onClick={() => setDashboardTab("commented")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h2 className="text-[15px] font-semibold">피드백이 필요한 프로젝트</h2>
                </div>
                <ReviewGrid
                  reviews={reviewItems}
                  onSelect={(r) => {
                    const item = myProjects.find((sp) => sp.project.id === r.id);
                    if (item) handleSelectProject(item.project, item.annotations);
                  }}
                  onDelete={() => {}}
                  onNew={() => {}}
                  emptyMessage="아직 피드백이 필요한 프로젝트가 없어요"
                  emptyDescription="첫 번째 프로젝트를 올려보세요"
                  showDelete={false}
                  hideNewButton
                  showAuthor
                />
              </div>
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
                  myProjects.forEach((sp) => {
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
                onBack={() => setDashboardTab("requested")}
                currentUserEmail={user.email}
              />
            )}

            {dashboardTab === "directory" && viewProfileEmail && (
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0"
                    onClick={() => setViewProfileEmail(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[13px] text-muted-foreground/50">디자이너 목록</span>
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
                    myProjects.forEach((sp) => {
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
        </div>
      );
    }

    // Upload screen
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Design Feedback
            </h1>
            <p className="text-[14px] text-muted-foreground/60">
              진짜 디자이너의 피드백을, AI에서 바로 쓸 수 있게
            </p>
          </div>
          <ImageUploader
            onImageSelected={handleImageSelected}
            onUrlScreenshot={handleUrlScreenshot}
          />
          {user ? (
            <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground/50">
              <span>{user.email}로 로그인됨</span>
              <button
                className="text-foreground/60 hover:text-foreground transition-colors underline underline-offset-2"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button
                className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background font-semibold"
                onClick={() => setShowAuth(true)}
              >
                시작하기
              </Button>
              <button
                className="text-[12px] text-muted-foreground/50 hover:text-foreground transition-colors"
                onClick={() => setShowAuth(true)}
              >
                이미 계정이 있나요? <span className="underline underline-offset-2">로그인</span>
              </button>
            </div>
          )}
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background">
        <div className="flex items-center gap-2">
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            onClick={handleSaveAndGoBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold truncate max-w-[200px]">
            {project.name}
          </h1>
          {activePage && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <a
                href={activePage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {activePage.title}
              </a>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(!project.status || project.status === "receiving") && (
            <Button
              size="sm"
              onClick={() => setShowExport(true)}
              disabled={annotations.length === 0}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <FileOutput className="h-4 w-4 mr-1.5" />
              AI용 내보내기
            </Button>
          )}
          {project.status === "applying" && user?.email === project.created_by && (
            <Button
              size="sm"
              onClick={handleMarkCompleted}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              반영 완료
            </Button>
          )}
          {project.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComplete(true)}
            >
              Before / After 보기
            </Button>
          )}
          {project.status === "completed" && user?.email === project.created_by && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToReceiving}
            >
              다시 피드백 받기
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
              projectStatus={project.status ?? "receiving"}
            />
          )}
        </div>

        {/* Comment sidebar */}
        <div className="w-80 border-l bg-background flex flex-col">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">피드백</h2>
              <span className="text-[12px] text-muted-foreground/50">{annotations.length}</span>
            </div>
            {project.status === "applying" && (
              <p className="text-[12px] text-amber-600 mt-1">피드백 적용 중 · 새 피드백 추가 불가</p>
            )}
            {project.status === "completed" && (
              <p className="text-[12px] text-emerald-600 mt-1">업데이트 완료</p>
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
              <DialogTitle>AI용 내보내기</DialogTitle>
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
              {project.completedImageUrl ? "Before / After" : "반영 완료"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[75vh]">
            <BeforeAfterView
              beforeImageUrl={activePage?.image_url ?? project.pages[0]?.image_url ?? ""}
              afterImageUrl={project.completedImageUrl}
              projectName={project.name}
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
            <DialogTitle>페이지 추가</DialogTitle>
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
            <DialogTitle>발견된 페이지</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            이 사이트에서 {discoveredLinks.length}개의 페이지를 찾았어요.
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
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      alreadyAdded
                        ? "bg-primary/5 border border-primary/20"
                        : "border border-border/50 hover:border-border"
                    }`}
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {link.text}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 truncate">
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
                        ? "캡처 중..."
                        : alreadyAdded
                          ? "추가됨"
                          : "추가"}
                    </Button>
                  </div>
                );
              })}
            </div>
          <Button
            className="w-full mt-2"
            onClick={() => setShowPagePicker(false)}
          >
            완료
          </Button>
        </DialogContent>
      </Dialog>

      <AuthModal
        open={showAuth}
        onOpenChange={setShowAuth}
        onAuth={handleAuth}
      />

      {/* Profile modal */}
      {viewProfileEmail && (
        <ProfileViewModal
          open={!!viewProfileEmail}
          onOpenChange={(open) => { if (!open) setViewProfileEmail(null); }}
          email={viewProfileEmail}
          currentUserEmail={user?.email}
        />
      )}
    </div>
  );
}
