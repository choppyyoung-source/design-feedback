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
    <div className="w-52 border-r border-border/50 bg-muted/10 flex flex-col">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground/70">페이지</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-foreground"
          onClick={onAddPage}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2.5 space-y-1.5">
          {pages.map((page) => {
            const count = annotationCounts[page.id] ?? 0;
            const isActive = activePageId === page.id;
            return (
              <div
                key={page.id}
                className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all ${
                  isActive
                    ? "ring-1 ring-primary/25 shadow-sm"
                    : "hover:bg-muted/40"
                }`}
                onClick={() => onSelectPage(page.id)}
              >
                {/* Delete button */}
                {pages.length > 1 && (
                  <button
                    className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-foreground/60 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(page.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                {/* Thumbnail */}
                <div className="aspect-video bg-muted/30 overflow-hidden">
                  {page.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={page.image_url}
                      alt={page.title}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex items-center justify-between px-2.5 py-2">
                  <p className={`text-[12px] truncate ${isActive ? "font-semibold text-foreground" : "font-medium text-foreground/60"}`}>
                    {page.title}
                  </p>
                  {count > 0 && (
                    <span className={`text-[9px] font-medium rounded-full px-1.5 py-0.5 flex-shrink-0 ml-1 ${
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
