"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Image as ImageIcon, Link, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/i18n";

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
  const t = useT();
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
        setError(data.error || t("upload.captureError"));
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
  }, [url, onUrlScreenshot, t]);

  return (
    <div className="space-y-5">
      {/* URL Input */}
      <div className="rounded-md border border-[rgba(0,0,0,0.1)] bg-card p-5">
        <h3 className="font-semibold text-[15px] mb-3">{t("upload.pasteLink")}</h3>
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
            className="h-10 px-5 bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.95)]/90 text-background"
          >
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                {t("upload.capturing")}
              </>
            ) : (
              t("upload.capture")
            )}
          </Button>
        </div>
        {error && <p className="text-[13px] text-destructive mt-2">{error}</p>}
        <p className="text-sm text-[#a39e98] mt-2">
          {t("upload.autoScreenshot")}
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-sm text-[#a39e98] font-medium">{t("upload.or")}</span>
        <Separator className="flex-1" />
      </div>

      {/* File Upload */}
      <div
        className={`relative rounded-md transition-all cursor-pointer group/upload ${
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
        <div className={`p-8 text-center rounded-md transition-colors ${
          isDragOver ? "bg-primary/5" : "bg-card hover:bg-[#f6f5f4]"
        }`}>
          <div className="flex flex-col items-center gap-2.5">
            <div className={`w-11 h-11 rounded-md flex items-center justify-center transition-colors ${
              isDragOver ? "bg-primary/15" : "bg-[#f6f5f4]"
            }`}>
              {isDragOver ? (
                <ImageIcon className="w-5 h-5 text-primary" />
              ) : (
                <Upload className="w-5 h-5 text-[#a39e98]" />
              )}
            </div>
            <div>
              <p className="font-semibold text-[14px]">
                {isDragOver ? t("upload.dropHere") : t("upload.directUpload")}
              </p>
              <p className="text-sm text-[#a39e98] mt-0.5">
                {t("upload.dragAndDrop")}
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
