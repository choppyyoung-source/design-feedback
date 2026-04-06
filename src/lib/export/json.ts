import type { ExportData } from "@/types";

export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}
