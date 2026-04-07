"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Link, Loader2 } from "lucide-react";

interface BeforeAfterViewProps {
  beforeImageUrl: string;
  afterImageUrl?: string;
  projectName: string;
  onCaptureAfter: (imageDataUrl: string) => void;
  onUploadAfter: (imageDataUrl: string) => void;
}

export function BeforeAfterView({
  beforeImageUrl,
  afterImageUrl,
  projectName,
  onCaptureAfter,
  onUploadAfter,
}: BeforeAfterViewProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captureUrl, setCaptureUrl] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

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
    };
    reader.readAsDataURL(file);
  };

  // No after image yet → show upload prompt
  if (!afterImageUrl) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">피드백 반영 완료!</h3>
          <p className="text-sm text-muted-foreground">
            업데이트된 화면을 올려주세요. Before/After를 비교할 수 있어요.
          </p>
        </div>

        {/* URL capture */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2">
              <input
                className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="업데이트된 페이지 URL"
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
                    캡처
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">또는</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full h-9"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            이미지 직접 올리기
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Before preview */}
        <div className="w-full max-w-md">
          <p className="text-xs text-muted-foreground mb-2">Before</p>
          <div className="rounded-lg overflow-hidden border bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={beforeImageUrl}
              alt="Before"
              className="w-full object-cover object-top max-h-48"
            />
          </div>
        </div>
      </div>
    );
  }

  // Both images → slider comparison
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-1">Before / After</h3>
        <p className="text-sm text-muted-foreground">
          슬라이더를 움직여서 비교해보세요
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden border shadow-sm cursor-col-resize select-none"
        onMouseDown={() => { isDragging.current = true; }}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; }}
        onMouseMove={(e) => { if (isDragging.current) handleMove(e.clientX); }}
        onClick={(e) => handleMove(e.clientX)}
      >
        {/* After (full width behind) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterImageUrl}
          alt="After"
          className="w-full block"
          draggable={false}
        />

        {/* Before (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeImageUrl}
            alt="Before"
            className="block"
            style={{ width: containerRef.current?.offsetWidth ?? "100%" }}
            draggable={false}
          />
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
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
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium">
          Before
        </div>
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium">
          After
        </div>
      </div>
    </div>
  );
}
