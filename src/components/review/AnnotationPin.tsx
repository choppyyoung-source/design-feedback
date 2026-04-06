"use client";

import { useCallback, useRef } from "react";
import { CATEGORY_COLORS, type Annotation } from "@/types";
import { useReviewStore } from "@/lib/store/review-store";

interface AnnotationPinProps {
  annotation: Annotation;
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  imageWidth: number;
  imageHeight: number;
}

export function AnnotationPin({
  annotation,
  index,
  containerRef,
  imageWidth,
  imageHeight,
}: AnnotationPinProps) {
  const {
    selectedAnnotationId,
    setSelectedAnnotationId,
    updateAnnotation,
    isPinMode,
    setDraggingPinId,
  } = useReviewStore();
  const isSelected = selectedAnnotationId === annotation.id;
  const color = CATEGORY_COLORS[annotation.category];
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isPinMode) return; // Don't drag when placing new pins
      e.stopPropagation();
      e.preventDefault();
      isDragging.current = false;
      dragStartPos.current = { x: e.clientX, y: e.clientY };

      const handleMouseMove = (moveE: MouseEvent) => {
        const dx = moveE.clientX - dragStartPos.current.x;
        const dy = moveE.clientY - dragStartPos.current.y;
        if (!isDragging.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          isDragging.current = true;
          setDraggingPinId(annotation.id);
        }

        if (isDragging.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const x = moveE.clientX - rect.left;
          const y = moveE.clientY - rect.top;
          const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
          const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));
          const xPx = Math.round((xPct / 100) * imageWidth);
          const yPx = Math.round((yPct / 100) * imageHeight);

          updateAnnotation(annotation.id, {
            pin_x_pct: xPct,
            pin_y_pct: yPct,
            pin_x_px: xPx,
            pin_y_px: yPx,
          });
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        setDraggingPinId(null);

        if (!isDragging.current) {
          // It was a click, not a drag
          setSelectedAnnotationId(isSelected ? null : annotation.id);
        }
        isDragging.current = false;
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [
      annotation.id,
      containerRef,
      imageWidth,
      imageHeight,
      isSelected,
      isPinMode,
      setDraggingPinId,
      setSelectedAnnotationId,
      updateAnnotation,
    ]
  );

  return (
    <div
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 group ${
        isPinMode ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"
      }`}
      style={{
        left: `${annotation.pin_x_pct}%`,
        top: `${annotation.pin_y_pct}%`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Selection ring */}
      {isSelected && (
        <div
          className="absolute inset-0 -m-2 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: color }}
        />
      )}
      <div
        className={`relative flex items-center justify-center rounded-full text-white text-xs font-bold shadow-lg transition-all ${
          isSelected
            ? "w-9 h-9 ring-3 ring-white shadow-xl"
            : "w-7 h-7 hover:scale-110"
        }`}
        style={{ backgroundColor: color }}
      >
        {index + 1}
      </div>
      {/* Region bounds are rendered in ReviewCanvas */}
      {/* Tooltip on hover */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {annotation.area_label || annotation.comment.slice(0, 40)}
      </div>
    </div>
  );
}
