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
      }));

      // My individual comments across all projects
      const myComments = myProjects.flatMap((sp) =>
        Object.entries(sp.annotations).flatMap(([pageId, annotations]) =>
          (annotations as Annotation[])
            .filter((a) => a.author_name === user.email)
            .map((a) => ({
              annotation: a,
              projectName: sp.project.name,
              pageName: sp.project.pages.find((p) => p.id === pageId)?.title ?? "",
              projectId: sp.project.id,
              imageUrl: sp.project.pages.find((p) => p.id === pageId)?.image_url ?? sp.project.pages[0]?.image_url,
            }))
        )
      ).sort((a, b) => b.annotation.created_at.localeCompare(a.annotation.created_at));

      return (
        <div className="flex-1 bg-muted/20 min-h-screen">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white border-b border-border/60">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex items-center justify-between h-16">
                <h1 className="text-xl font-bold">Design Feedback</h1>
                <button
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
              {/* Tabs */}
              <div className="flex items-center gap-7 -mb-px mt-2">
                {([
                  { key: "requested", label: "요청한 피드백" },
                  { key: "commented", label: "내가 남긴 피드백" },
                  { key: "directory", label: "디자이너 찾기" },
                  { key: "profile", label: "내 프로필" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    className={`pb-3 text-[15px] font-medium border-b-2 transition-colors ${
                      dashboardTab === tab.key
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
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
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/60 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-5"
                  onClick={() => setDashboardTab("commented")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  뒤로가기
                </button>
                <h2 className="text-lg font-semibold mb-4">피드백이 필요한 프로젝트</h2>
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
              />
            )}

            {dashboardTab === "directory" && !viewProfileEmail && (
              <DesignerDirectory
                onSelectProfile={(email) => setViewProfileEmail(email)}
                currentUserEmail={user.email}
              />
            )}

            {dashboardTab === "directory" && viewProfileEmail && (
              <div>
                <button
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
                  onClick={() => setViewProfileEmail(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  디자이너 목록으로
                </button>
                <ProfileSection
                  email={viewProfileEmail}
                  currentUserEmail={user.email}
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
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI-ready design feedback
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Design Feedback
            </h1>
            <p className="text-muted-foreground text-base">
              내 제품을 올리고, 디자이너 코멘트를 받고, AI용으로 내보내세요.
            </p>
          </div>
          <ImageUploader
            onImageSelected={handleImageSelected}
            onUrlScreenshot={handleUrlScreenshot}
          />
          {user ? (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>{user.email}로 로그인됨</span>
              <button
                className="text-primary hover:underline"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setShowAuth(true)}
              >
                이미 계정이 있나요? 로그인
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
      <div className="flex items-center justify-between px-5 py-2.5 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleSaveAndGoBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold truncate max-w-[200px]">
            {project.name}
          </h1>
          {activePage && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-xs text-muted-foreground">
                {activePage.title}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isPinMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!user) {
                setShowAuth(true);
                return;
              }
              setIsPinMode(!isPinMode);
            }}
          >
            {isPinMode ? (
              <MousePointerClick className="h-4 w-4 mr-1.5" />
            ) : (
              <Pin className="h-4 w-4 mr-1.5" />
            )}
            {isPinMode ? "핀 찍는 중..." : "핀 추가"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExport(true)}
            disabled={annotations.length === 0}
          >
            <FileOutput className="h-4 w-4 mr-1.5" />
            AI용 내보내기
          </Button>

          {user && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
              <button
                className="text-xs text-muted-foreground truncate max-w-[120px] hover:text-primary hover:underline"
                onClick={() => { handleSaveAndGoBack(); setTimeout(() => setDashboardTab("profile"), 100); }}
              >
                {user.email}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleLogout}
              >
                <LogOut className="h-3 w-3" />
              </Button>
            </div>
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
            />
          )}
        </div>

        {/* Comment sidebar */}
        <div className="w-80 border-l bg-background flex flex-col">
          <div className="px-3 py-2 border-b">
            <h2 className="text-sm font-semibold">
              코멘트 ({annotations.length})
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <AnnotationPanel
              onDelete={handleDeleteAnnotation}
              onLoginClick={() => setShowAuth(true)}
              currentUserEmail={user?.email}
              ownerEmail={project.created_by}
              onProfileClick={(email) => setViewProfileEmail(email)}
            />
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {reviewForExport && (
        <Dialog open={showExport} onOpenChange={setShowExport}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>AI용 내보내기</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ExportPreview
                review={reviewForExport}
                annotations={annotations}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

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
