import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    if (process.env.VERCEL) {
      // Vercel: use Microlink screenshot API (free, no browser needed)
      const targetUrl = parsedUrl.toString();
      const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1440&viewport.height=900&screenshot.fullPage=true&force=true&waitForTimeout=2000`;

      const res = await fetch(microlinkUrl, { signal: AbortSignal.timeout(20000) });

      if (!res.ok) {
        throw new Error(`Microlink API error: ${res.status}`);
      }

      // Microlink with embed=screenshot.url redirects to the image URL
      // If it's an image, convert to base64
      const contentType = res.headers.get("content-type") || "";

      if (contentType.startsWith("image/")) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const base64 = buffer.toString("base64");
        const mimeType = contentType.split(";")[0];
        return NextResponse.json({
          image: `data:${mimeType};base64,${base64}`,
          width: 1440,
          height: 900,
          sourceUrl: targetUrl,
        });
      }

      // If JSON response (no embed redirect), parse and fetch image
      const data = await res.json();
      if (data.status === "success" && data.data?.screenshot?.url) {
        const imgRes = await fetch(data.data.screenshot.url, {
          signal: AbortSignal.timeout(15000),
        });
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const base64 = buffer.toString("base64");
        return NextResponse.json({
          image: `data:image/png;base64,${base64}`,
          width: 1440,
          height: 900,
          sourceUrl: targetUrl,
        });
      }

      throw new Error("No screenshot in response");
    } else {
      // Local: use full puppeteer
      const puppeteer = (await import("puppeteer")).default;
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(parsedUrl.toString(), {
        waitUntil: "networkidle2",
        timeout: 15000,
      });

      await new Promise((r) => setTimeout(r, 1000));

      const screenshot = await page.screenshot({
        type: "png",
        fullPage: true,
      });

      await browser.close();

      const base64 = Buffer.from(screenshot as Buffer).toString("base64");
      return NextResponse.json({
        image: `data:image/png;base64,${base64}`,
        width: 1440,
        height: 900,
        sourceUrl: parsedUrl.toString(),
      });
    }
  } catch (error) {
    console.error("Screenshot error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to capture screenshot. Check if the URL is accessible.",
      },
      { status: 500 }
    );
  }
}
