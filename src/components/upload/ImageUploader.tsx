"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Image as ImageIcon, Link, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface DiscoveredLink {
  url: string;
  text: string;
  ogImage?: string | null;
}

interface ImageUploaderProps {
  onImageSelected: (file: File, previewUrl: string) => void;
  onUrlScreenshot: (data: {
    imageDataUrl: string;
    width: number;
    height: number;
    sourceUrl: string;
    discoveredLinks?: DiscoveredLink[];
  }) => void;
}

export function ImageUploader({
  onImageSelected,
  onUrlScreenshot,
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [url, setUrl] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const previewUrl = URL.createObjectURL(file);
      onImageSelected(file, previewUrl);
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleUrlCapture = useCallback(async () => {
    if (!url.trim()) return;
    setError("");
    setIsCapturing(true);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "캡처에 실패했어요");
        return;
      }

      onUrlScreenshot({
        imageDataUrl: data.currentPage.image,
        width: data.currentPage.width,
        height: data.currentPage.height,
        sourceUrl: data.currentPage.url,
        discoveredLinks: data.links ?? [],
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }, [url, onUrlScreenshot]);

  return (
    <div className="space-y-5">
      {/* URL Input */}
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <h3 className="font-semibold text-[15px] mb-3">링크 붙여넣기</h3>
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUrlCapture();
            }}
            disabled={isCapturing}
            className="h-10 bg-white"
          />
          <Button
            onClick={handleUrlCapture}
            disabled={!url.trim() || isCapturing}
            className="h-10 px-5 bg-foreground hover:bg-foreground/90 text-background"
          >
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                캡처 중...
              </>
            ) : (
              "캡처"
            )}
          </Button>
        </div>
        {error && <p className="text-[13px] text-destructive mt-2">{error}</p>}
        <p className="text-[12px] text-muted-foreground/50 mt-2">
          페이지의 스크린샷을 자동으로 찍어요
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-[12px] text-muted-foreground/40 font-medium">또는</span>
        <Separator className="flex-1" />
      </div>

      {/* File Upload */}
      <div
        className={`relative rounded-2xl transition-all cursor-pointer group/upload ${
          isDragOver ? "scale-[1.01]" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("image-input")?.click()}
      >
        {/* Animated dash border */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
          <rect
            className={isDragOver ? "stroke-primary" : "dash-border"}
            x="1" y="1"
            rx="16"
            strokeWidth="1"
            strokeDasharray="5 4"
            style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
          />
        </svg>
        <div className={`p-8 text-center rounded-2xl transition-colors ${
          isDragOver ? "bg-primary/5" : "bg-card hover:bg-muted/20"
        }`}>
          <div className="flex flex-col items-center gap-2.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
              isDragOver ? "bg-primary/15" : "bg-muted/50"
            }`}>
              {isDragOver ? (
                <ImageIcon className="w-5 h-5 text-primary" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground/50" />
              )}
            </div>
            <div>
              <p className="font-semibold text-[14px]">
                {isDragOver ? "여기에 놓으세요" : "이미지 직접 올리기"}
              </p>
              <p className="text-[12px] text-muted-foreground/50 mt-0.5">
                드래그 앤 드롭하거나 클릭해서 선택. PNG, JPG, WebP
              </p>
            </div>
          </div>
        </div>
        <input
          id="image-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
}
