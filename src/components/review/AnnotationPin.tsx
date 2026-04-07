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

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedAnnotationId(isSelected ? null : annotation.id);
    },
    [annotation.id, isSelected, setSelectedAnnotationId]
  );

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
      style={{
        left: `${annotation.pin_x_pct}%`,
        top: `${annotation.pin_y_pct}%`,
      }}
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
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
