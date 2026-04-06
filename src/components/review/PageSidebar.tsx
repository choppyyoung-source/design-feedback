"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileImage, X } from "lucide-react";
import type { ReviewPage } from "@/types";

interface PageSidebarProps {
  pages: ReviewPage[];
  activePageId: string;
  annotationCounts: Record<string, number>;
  onSelectPage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onAddPage: () => void;
}

export function PageSidebar({
  pages,
  activePageId,
  annotationCounts,
  onSelectPage,
  onDeletePage,
  onAddPage,
}: PageSidebarProps) {
  return (
    <div className="w-48 border-r bg-muted/20 flex flex-col">
      <div className="px-3 py-2.5 border-b flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">페이지</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onAddPage}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className={`relative group w-full text-left rounded-lg p-2 transition-colors cursor-pointer ${
                activePageId === page.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => onSelectPage(page.id)}
            >
              {/* Delete button - only show if more than 1 page */}
              {pages.length > 1 && (
                <button
                  className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(page.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {/* Thumbnail */}
              <div className="aspect-video rounded-md bg-muted overflow-hidden mb-1.5">
                {page.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.image_url}
                    alt={page.title}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium truncate">
                  {page.title}
                </p>
                {(annotationCounts[page.id] ?? 0) > 0 && (
                  <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                    {annotationCounts[page.id]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
