"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Link, Loader2, RefreshCw, ArrowLeft, Star } from "lucide-react";
import { getEmoji } from "@/lib/avatar";
import { getProfile, type UserProfile } from "@/lib/profiles";
import { useT } from "@/lib/i18n";
import type { Annotation } from "@/types";

interface BeforeAfterViewProps {
  beforeImageUrl: string;
  afterImageUrl?: string;
  projectName: string;
  onCaptureAfter: (imageDataUrl: string) => void;
  onUploadAfter: (imageDataUrl: string) => void;
  /** Annotations that were marked as applied (already filtered). */
  appliedAnnotations?: Annotation[];
  /** Called when the user clicks a designer (avatar / card) to open their profile. */
  onProfileClick?: (email: string, options?: { openRating?: boolean }) => void;
  /** Current viewer's email — used to hide the Rate button when self-rating. */
  currentUserEmail?: string;
}

export function BeforeAfterView({
  beforeImageUrl,
  afterImageUrl,
  projectName,
  onCaptureAfter,
  onUploadAfter,
  appliedAnnotations = [],
  onProfileClick,
  currentUserEmail,
}: BeforeAfterViewProps) {
  const t = useT();
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captureUrl, setCaptureUrl] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>({});

  // Fetch profiles for unique annotation authors
  useEffect(() => {
    if (!appliedAnnotations.length) return;
    const emails = Array.from(new Set(appliedAnnotations.map((a) => a.author_name)));
    let cancelled = false;
    Promise.all(
      emails.map(async (email) => [email, await getProfile(email)] as const)
    ).then((entries) => {
      if (cancelled) return;
      setProfiles(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [appliedAnnotations]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    setSliderPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  };

  const handleCapture = async () => {
    if (!captureUrl.trim()) return;
    setIsCapturing(true);
    try {
      const res = await fetch("/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: captureUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        onCaptureAfter(data.image);
        setIsReplacing(false);
        setCaptureUrl("");
      }
    } catch {
      /* ignore */
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUploadAfter(reader.result as string);
      setIsReplacing(false);
    };
    reader.readAsDataURL(file);
  };

  // Upload prompt — shown when there's no after image, or user is replacing it
  const showUploadView = !afterImageUrl || isReplacing;

  if (showUploadView) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-6">
        <div className="text-center">
          {isReplacing ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setIsReplacing(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t("beforeAfter.back")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h3 className="text-lg font-semibold">{t("beforeAfter.replaceTitle")}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("beforeAfter.replaceDesc")}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-1">{t("beforeAfter.appliedTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("beforeAfter.appliedDesc")}
              </p>
            </>
          )}
        </div>

        {/* URL capture */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2">
              <input
                className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("beforeAfter.urlPlaceholder")}
                value={captureUrl}
                onChange={(e) => setCaptureUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCapture()}
              />
              <Button
                size="sm"
                className="h-9"
                disabled={!captureUrl.trim() || isCapturing}
                onClick={handleCapture}
              >
                {isCapturing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Link className="h-3.5 w-3.5 mr-1.5" />
                    {t("beforeAfter.capture")}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t("beforeAfter.or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full h-9"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {t("beforeAfter.directUpload")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Current image preview */}
        <div className="w-full max-w-md">
          <p className="text-xs text-muted-foreground mb-2">
            {isReplacing ? t("beforeAfter.currentAfter") : "Before"}
          </p>
          <div className="rounded-lg overflow-hidden border bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isReplacing ? afterImageUrl : beforeImageUrl}
              alt={isReplacing ? "Current After" : "Before"}
              className="w-full object-cover object-top max-h-48"
            />
          </div>
        </div>
      </div>
    );
  }

  // Group applied annotations by author
  const byAuthor = appliedAnnotations.reduce<Record<string, Annotation[]>>(
    (acc, a) => {
      (acc[a.author_name] ||= []).push(a);
      return acc;
    },
    {}
  );
  const authorEntries = Object.entries(byAuthor);

  // Comparison view
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 text-center">
          <h3 className="text-lg font-semibold mb-1">{t("beforeAfter.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("beforeAfter.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsReplacing(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
          title={t("beforeAfter.reuploadTitle")}
        >
          <RefreshCw className="h-3 w-3" />
          {t("beforeAfter.reupload")}
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden border shadow-sm cursor-col-resize select-none"
        onMouseDown={() => {
          isDragging.current = true;
        }}
        onMouseUp={() => {
          isDragging.current = false;
        }}
        onMouseLeave={() => {
          isDragging.current = false;
        }}
        onMouseMove={(e) => {
          if (isDragging.current) handleMove(e.clientX);
        }}
        onClick={(e) => handleMove(e.clientX)}
      >
        {/* After — normal flow, sets container height */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterImageUrl}
          alt="After"
          className="w-full block"
          draggable={false}
        />

        {/* Before — absolute overlay, clipped by slider, fit to same box as After */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeImageUrl}
            alt="Before"
            className="w-full h-full block object-cover object-top"
            draggable={false}
          />
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
          style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 rounded-full bg-foreground/30" />
              <div className="w-0.5 h-3 rounded-full bg-foreground/30" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium pointer-events-none">
          Before
        </div>
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium pointer-events-none">
          After
        </div>
      </div>

      {/* Applied feedback section */}
      {authorEntries.length > 0 && (
        <div className="w-full max-w-2xl mx-auto mt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">{t("beforeAfter.appliedFeedback")}</h4>
            <span className="text-xs text-muted-foreground">
              {t("beforeAfter.appliedCount")
                .replace("{count}", String(appliedAnnotations.length))
                .replace("{designers}", String(authorEntries.length))}
            </span>
          </div>

          {/* Author avatars */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {authorEntries.map(([email, items]) => {
              const profile = profiles[email];
              const name = profile?.name || email.split("@")[0];
              const clickable = !!onProfileClick;
              return (
                <button
                  key={email}
                  type="button"
                  disabled={!clickable}
                  onClick={() => onProfileClick?.(email)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-border/50 ${
                    clickable ? "hover:bg-muted hover:border-border transition-colors cursor-pointer" : ""
                  }`}
                  title={email}
                >
                  <span className="text-base leading-none">{getEmoji(email)}</span>
                  <span className="text-xs font-medium">{name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Applied feedback list */}
          <div className="space-y-2">
            {appliedAnnotations.map((a) => {
              const profile = profiles[a.author_name];
              const name = profile?.name || a.author_name.split("@")[0];
              const canRate =
                !!onProfileClick &&
                !!currentUserEmail &&
                currentUserEmail !== a.author_name;
              return (
                <div
                  key={a.id}
                  className="group flex gap-3 p-3 rounded-lg border bg-card hover:border-border/80 transition-colors"
                >
                  <button
                    type="button"
                    disabled={!onProfileClick}
                    onClick={() => onProfileClick?.(a.author_name)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-base ${
                      onProfileClick ? "hover:ring-2 hover:ring-border transition-all cursor-pointer" : ""
                    }`}
                    title={a.author_name}
                    aria-label={a.author_name}
                  >
                    {getEmoji(a.author_name)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <button
                        type="button"
                        disabled={!onProfileClick}
                        onClick={() => onProfileClick?.(a.author_name)}
                        className={`text-xs font-semibold ${
                          onProfileClick ? "hover:underline cursor-pointer" : ""
                        }`}
                      >
                        {name}
                      </button>
                      {a.area_label && (
                        <span className="text-[10px] text-muted-foreground">
                          · {a.area_label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">
                      {a.comment}
                    </p>
                  </div>
                  {canRate && (
                    <button
                      type="button"
                      onClick={() =>
                        onProfileClick?.(a.author_name, { openRating: true })
                      }
                      className="self-start flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                      title={t("beforeAfter.rateDesigner")}
                    >
                      <Star className="h-3 w-3" />
                      {t("beforeAfter.rate")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
