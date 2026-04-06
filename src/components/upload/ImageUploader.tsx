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
    <div className="space-y-4">
      {/* URL Input */}
      <Card className="p-5 shadow-sm border-border/60">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Link className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">링크 붙여넣기</h3>
        </div>
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
          />
          <Button
            onClick={handleUrlCapture}
            disabled={!url.trim() || isCapturing}
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
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          페이지의 스크린샷을 자동으로 찍어요.
        </p>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground font-medium">또는</span>
        <Separator className="flex-1" />
      </div>

      {/* File Upload */}
      <Card
        className={`border-2 border-dashed transition-all cursor-pointer p-8 text-center shadow-sm ${
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("image-input")?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
            isDragOver ? "bg-primary/15" : "bg-muted"
          }`}>
            {isDragOver ? (
              <ImageIcon className="w-6 h-6 text-primary" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {isDragOver ? "여기에 놓으세요" : "이미지 직접 올리기"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              드래그 앤 드롭하거나 클릭해서 선택. PNG, JPG, WebP
            </p>
          </div>
        </div>
        <input
          id="image-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </Card>
    </div>
  );
}
