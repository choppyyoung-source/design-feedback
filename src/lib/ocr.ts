import Tesseract from "tesseract.js";

/**
 * Extract text from a specific region of an image.
 * Returns the detected text trimmed, or empty string if nothing found.
 */
export async function extractTextFromRegion(
  imageUrl: string,
  region: { xPct: number; yPct: number; wPct: number; hPct: number }
): Promise<string> {
  try {
    // Load image into canvas to crop region
    const img = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Calculate pixel coordinates from percentages
    const sx = (region.xPct / 100) * img.naturalWidth;
    const sy = (region.yPct / 100) * img.naturalHeight;
    const sw = (region.wPct / 100) * img.naturalWidth;
    const sh = (region.hPct / 100) * img.naturalHeight;

    // Minimum size check
    if (sw < 10 || sh < 10) return "";

    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const dataUrl = canvas.toDataURL("image/png");

    const result = await Tesseract.recognize(dataUrl, "eng+kor", {
      logger: () => {},
    });

    const text = result.data.text.trim().replace(/\s+/g, " ");
    return text;
  } catch {
    return "";
  }
}

/**
 * Extract text from area around a pin point.
 * Crops a region around the pin (±5% of image).
 */
export async function extractTextAroundPin(
  imageUrl: string,
  pin: { xPct: number; yPct: number }
): Promise<string> {
  const padding = 5; // 5% padding around pin
  return extractTextFromRegion(imageUrl, {
    xPct: Math.max(0, pin.xPct - padding),
    yPct: Math.max(0, pin.yPct - padding),
    wPct: Math.min(100 - Math.max(0, pin.xPct - padding), padding * 2),
    hPct: Math.min(100 - Math.max(0, pin.yPct - padding), padding * 2),
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
