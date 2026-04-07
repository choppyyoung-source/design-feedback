"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReviewStore } from "@/lib/store/review-store";
import { AnnotationPin } from "./AnnotationPin";
import { AnnotationForm } from "./AnnotationForm";
import { CATEGORY_COLORS as CATEGORY_COLORS_MAP } from "@/types";
import type {
  Annotation,
  AnnotationCategory,
  AnnotationSeverity,
  ChangeSpec,
  RegionBounds,
} from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getRegionKo } from "@/lib/export/region";
import { extractTextFromRegion, extractTextAroundPin } from "@/lib/ocr";

interface ReviewCanvasProps {
  pageId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  authorName?: string;
  isOwner?: boolean;
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
  projectStatus?: import("@/types").ProjectStatus;
}

export function ReviewCanvas({
  pageId,
  imageUrl,
  imageWidth,
  imageHeight,
  authorName = "Anonymous",
  isOwner,
  isLoggedIn = true,
  onLoginClick,
  projectStatus = "receiving",
}: ReviewCanvasProps) {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const {
    pageAnnotations,
    activePageId,
    addAnnotation,
    updateAnnotation,
    isPinMode,
    setIsPinMode,
    pendingPin,
    setPendingPin,
    pendingRegion,
    setPendingRegion,
    draggingPinId,
    setSelectedAnnotationId,
  } = useReviewStore();

  const annotations = activePageId ? (pageAnnotations[activePageId] || []) : [];

  const [formPosition, setFormPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Drag-to-select state (use ref for current value in closures)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, xPct: 0, yPct: 0 });
  const dragRectRef = useRef<{
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
  } | null>(null);
  const [dragRect, setDragRect] = useState<{
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
  } | null>(null);

  const getCoords = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const container = imageContainerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return {
        xPct: Math.max(0, Math.min(100, (x / rect.width) * 100)),
        yPct: Math.max(0, Math.min(100, (y / rect.height) * 100)),
        xPx: Math.round(
          Math.max(0, Math.min(imageWidth, (x / rect.width) * imageWidth))
        ),
        yPx: Math.round(
          Math.max(0, Math.min(imageHeight, (y / rect.height) * imageHeight))
        ),
        clientX: e.clientX,
        clientY: e.clientY,
      };
    },
    [imageWidth, imageHeight]
  );

  const canAddPin = projectStatus === "receiving";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPinMode || draggingPinId || !canAddPin) return;
      const coords = getCoords(e);
      if (!coords) return;

      isDraggingRef.current = false;
      dragRectRef.current = null;
      dragStartRef.current = {
        x: coords.clientX,
        y: coords.clientY,
        xPct: coords.xPct,
        yPct: coords.yPct,
      };

      const handleMouseMove = (moveE: MouseEvent) => {
        const dx = moveE.clientX - dragStartRef.current.x;
        const dy = moveE.clientY - dragStartRef.current.y;

        if (
          !isDraggingRef.current &&
          (Math.abs(dx) > 5 || Math.abs(dy) > 5)
        ) {
          isDraggingRef.current = true;
        }

        if (isDraggingRef.current) {
          const moveCoords = getCoords(moveE);
          if (!moveCoords) return;

          const newRect = {
            xPct: Math.min(dragStartRef.current.xPct, moveCoords.xPct),
            yPct: Math.min(dragStartRef.current.yPct, moveCoords.yPct),
            wPct: Math.abs(moveCoords.xPct - dragStartRef.current.xPct),
            hPct: Math.abs(moveCoords.yPct - dragStartRef.current.yPct),
          };
          dragRectRef.current = newRect;
          setDragRect(newRect);
        }
      };

      const handleMouseUp = (upE: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const upCoords = getCoords(upE);
        if (!upCoords) return;

        const currentDragRect = dragRectRef.current;

        // If not logged in, prompt login instead of placing pin
        if (!isLoggedIn) {
          setDragRect(null);
          dragRectRef.current = null;
          isDraggingRef.current = false;
          onLoginClick?.();
          return;
        }

        if (isDraggingRef.current && currentDragRect && currentDragRect.wPct > 1 && currentDragRect.hPct > 1) {
          // Region selection complete
          const region: RegionBounds = {
            xPct: currentDragRect.xPct,
            yPct: currentDragRect.yPct,
            wPct: currentDragRect.wPct,
            hPct: currentDragRect.hPct,
            xPx: Math.round((currentDragRect.xPct / 100) * imageWidth),
            yPx: Math.round((currentDragRect.yPct / 100) * imageHeight),
            wPx: Math.round((currentDragRect.wPct / 100) * imageWidth),
            hPx: Math.round((currentDragRect.hPct / 100) * imageHeight),
          };

          // Pin goes at center of region
          const centerXPct =
            currentDragRect.xPct + currentDragRect.wPct / 2;
          const centerYPct =
            currentDragRect.yPct + currentDragRect.hPct / 2;

          setPendingPin({
            xPct: centerXPct,
            yPct: centerYPct,
            xPx: Math.round((centerXPct / 100) * imageWidth),
            yPx: Math.round((centerYPct / 100) * imageHeight),
          });
          setPendingRegion(region);
          setFormPosition({ x: upE.clientX + 16, y: upE.clientY });
          setSelectedAnnotationId(null);
        } else {
          // Simple click - place pin at point
          setPendingPin({
            xPct: upCoords.xPct,
            yPct: upCoords.yPct,
            xPx: upCoords.xPx,
            yPx: upCoords.yPx,
          });
          setPendingRegion(null);
          setFormPosition({ x: upE.clientX + 16, y: upE.clientY });
          setSelectedAnnotationId(null);
        }

        setDragRect(null);
        dragRectRef.current = null;
        isDraggingRef.current = false;
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [
      isPinMode,
      draggingPinId,
      canAddPin,
      getCoords,
      imageWidth,
      imageHeight,
      setPendingPin,
      setPendingRegion,
      setSelectedAnnotationId,
    ]
  );

  const handleFormSubmit = useCallback(
    (data: {
      comment: string;
      category: AnnotationCategory;
      severity: AnnotationSeverity;
      areaLabel: string;
      changeSpec: ChangeSpec | null;
      authorName: string;
    }) => {
      if (!pendingPin) return;

      const id = uuidv4();
      const annotation = {
        id,
        review_id: "",
        pin_x_pct: pendingPin.xPct,
        pin_y_pct: pendingPin.yPct,
        pin_x_px: pendingPin.xPx,
        pin_y_px: pendingPin.yPx,
        region_bounds: pendingRegion,
        category: data.category,
        severity: data.severity,
        area_label: data.areaLabel,
        comment: data.comment,
        change_spec: data.changeSpec,
        author_name: authorName,
        created_at: new Date().toISOString(),
        order_index: annotations.length,
        replies: [],
      };

      addAnnotation(annotation);

      // Run OCR in background to extract text from the annotated area
      const ocrPromise = pendingRegion
        ? extractTextFromRegion(imageUrl, {
            xPct: pendingRegion.xPct,
            yPct: pendingRegion.yPct,
            wPct: pendingRegion.wPct,
            hPct: pendingRegion.hPct,
          })
        : extractTextAroundPin(imageUrl, {
            xPct: pendingPin.xPct,
            yPct: pendingPin.yPct,
          });

      ocrPromise.then((text) => {
        if (text) {
          updateAnnotation(id, {
            area_label: text.length > 80 ? text.slice(0, 80) + "..." : text,
          });
        }
      });

      setPendingPin(null);
      setPendingRegion(null);
      setFormPosition(null);
      // Keep pin mode always on
    },
    [
      pendingPin,
      pendingRegion,
      annotations.length,
      addAnnotation,
      updateAnnotation,
      imageUrl,
      authorName,
      setPendingPin,
      setPendingRegion,
      setIsPinMode,
    ]
  );

  const handleFormCancel = useCallback(() => {
    setPendingPin(null);
    setPendingRegion(null);
    setFormPosition(null);
  }, [setPendingPin, setPendingRegion]);

  // Pan & zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    // Zoom with ctrl/cmd + scroll
    const wheelHandler = (e: WheelEvent) => {
      if (!outer.contains(e.target as Node)) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        setZoom((prev) => Math.min(3, Math.max(0.25, prev - e.deltaY * 0.002)));
      }
    };

    // Space key for pan mode
    const keyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpaceHeld(true);
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceHeld(false);
        isPanningRef.current = false;
      }
    };

    // Pan drag
    const mouseDown = (e: MouseEvent) => {
      if (!outer.contains(e.target as Node)) return;
      // Check space state via DOM - we read from the state ref
      if (!outer.dataset.spaceHeld || outer.dataset.spaceHeld !== "1") return;
      e.preventDefault();
      e.stopPropagation();
      isPanningRef.current = true;
      const currentPanX = parseFloat(outer.dataset.panX || "0");
      const currentPanY = parseFloat(outer.dataset.panY || "0");
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: currentPanX, panY: currentPanY };
    };
    const mouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
    };
    const mouseUp = () => {
      isPanningRef.current = false;
    };

    document.addEventListener("wheel", wheelHandler, { passive: false });
    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", keyUp);
    document.addEventListener("mousedown", mouseDown, true);
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", mouseUp);
    return () => {
      document.removeEventListener("wheel", wheelHandler);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", keyUp);
      document.removeEventListener("mousedown", mouseDown, true);
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseup", mouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={outerRef}
      className={`relative w-full h-full overflow-hidden bg-muted/30 ${
        isSpaceHeld ? "cursor-grab" : ""
      }`}
      data-space-held={isSpaceHeld ? "1" : ""}
      data-pan-x={pan.x}
      data-pan-y={pan.y}
    >
      <div
        ref={imageContainerRef}
        className={`relative inline-block select-none ${
          isSpaceHeld ? "pointer-events-none" : (isPinMode && canAddPin) ? "cursor-crosshair" : "cursor-default"
        }`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          margin: "32px auto",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Design for review"
          className="block max-w-full rounded-sm shadow-sm"
          draggable={false}
        />

        {/* Region overlays for saved annotations */}
        {annotations.map((annotation) =>
          annotation.region_bounds ? (
            <div
              key={`region-${annotation.id}`}
              className="absolute pointer-events-none border-2 border-dashed rounded-sm"
              style={{
                left: `${annotation.region_bounds.xPct}%`,
                top: `${annotation.region_bounds.yPct}%`,
                width: `${annotation.region_bounds.wPct}%`,
                height: `${annotation.region_bounds.hPct}%`,
                borderColor: `${CATEGORY_COLORS_MAP[annotation.category]}80`,
                backgroundColor: `${CATEGORY_COLORS_MAP[annotation.category]}10`,
              }}
            />
          ) : null
        )}

        {/* Rendered pins */}
        {annotations.map((annotation, index) => (
          <AnnotationPin
            key={annotation.id}
            annotation={annotation}
            index={index}
            containerRef={imageContainerRef}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
          />
        ))}

        {/* Live drag rectangle */}
        {dragRect && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-sm pointer-events-none z-20"
            style={{
              left: `${dragRect.xPct}%`,
              top: `${dragRect.yPct}%`,
              width: `${dragRect.wPct}%`,
              height: `${dragRect.hPct}%`,
            }}
          />
        )}

        {/* Pending region highlight */}
        {pendingRegion && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/15 rounded-sm pointer-events-none z-20 animate-pulse"
            style={{
              left: `${pendingRegion.xPct}%`,
              top: `${pendingRegion.yPct}%`,
              width: `${pendingRegion.wPct}%`,
              height: `${pendingRegion.hPct}%`,
            }}
          />
        )}

        {/* Pending pin indicator */}
        {pendingPin && (
          <div
            className="absolute z-20 w-7 h-7 rounded-full bg-blue-500 border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 animate-pulse"
            style={{
              left: `${pendingPin.xPct}%`,
              top: `${pendingPin.yPct}%`,
            }}
          />
        )}
      </div>

      {/* Floating annotation form */}
      {formPosition && pendingPin && (
        <div
          className="fixed z-50"
          style={{
            left: Math.min(formPosition.x, window.innerWidth - 340),
            top: Math.min(formPosition.y - 20, window.innerHeight - 500),
          }}
        >
          <AnnotationForm
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            defaultAreaLabel={
              pendingPin
                ? getRegionKo(pendingPin.xPct, pendingPin.yPct)
                : undefined
            }
            isOwner={isOwner}
          />
        </div>
      )}
    </div>
  );
}
