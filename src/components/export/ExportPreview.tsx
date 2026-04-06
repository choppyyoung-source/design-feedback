"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Download } from "lucide-react";
import type { Review, Annotation } from "@/types";
import { buildExportData } from "@/lib/export/build-export-data";
import { exportToMarkdown } from "@/lib/export/markdown";
import { exportToJSON } from "@/lib/export/json";

interface ExportPreviewProps {
  review: Review;
  annotations: Annotation[];
}

export function ExportPreview({ review, annotations }: ExportPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("markdown");

  const exportData = useMemo(
    () => buildExportData(review, annotations),
    [review, annotations]
  );

  const markdownOutput = useMemo(
    () => exportToMarkdown(exportData),
    [exportData]
  );
  const jsonOutput = useMemo(() => exportToJSON(exportData), [exportData]);

  const currentOutput = activeTab === "markdown" ? markdownOutput : jsonOutput;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeTab === "markdown" ? "md" : "json";
    const type = activeTab === "markdown" ? "text/markdown" : "application/json";
    const blob = new Blob([currentOutput], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${review.title.replace(/\s+/g, "-").toLowerCase()}-review.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <TabsList>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        <TabsContent value="markdown" className="flex-1 overflow-auto m-0">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-foreground/80">
            {markdownOutput}
          </pre>
        </TabsContent>
        <TabsContent value="json" className="flex-1 overflow-auto m-0">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-foreground/80">
            {jsonOutput}
          </pre>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
