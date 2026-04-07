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
      // Vercel: use Microlink API for screenshot + fetch for link extraction
      const targetUrl = parsedUrl.toString();

      // 1) Screenshot via Microlink
      const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1440&viewport.height=900&waitForTimeout=2000`;
      const screenshotRes = await fetch(microlinkUrl, {
        signal: AbortSignal.timeout(25000),
      });

      let screenshotBase64 = "";
      if (screenshotRes.ok) {
        const contentType = screenshotRes.headers.get("content-type") || "";
        if (contentType.startsWith("image/")) {
          const buffer = Buffer.from(await screenshotRes.arrayBuffer());
          const mimeType = contentType.split(";")[0];
          screenshotBase64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
        } else {
          const data = await screenshotRes.json();
          if (data.status === "success" && data.data?.screenshot?.url) {
            const imgRes = await fetch(data.data.screenshot.url, {
              signal: AbortSignal.timeout(15000),
            });
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            screenshotBase64 = `data:image/png;base64,${buffer.toString("base64")}`;
          }
        }
      }

      if (!screenshotBase64) {
        throw new Error("Failed to capture screenshot");
      }

      // 2) Get page title + links via Microlink metadata
      let pageTitle = parsedUrl.hostname;
      const links: { url: string; text: string }[] = [];

      try {
        const metaRes = await fetch(
          `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (metaData.data?.title) {
            pageTitle = metaData.data.title;
          }
        }
      } catch {
        // title fetch failed, use hostname
      }

      return NextResponse.json({
        currentPage: {
          url: targetUrl,
          title: pageTitle,
          image: screenshotBase64,
          width: 1440,
          height: 900,
        },
        links,
      });
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

      const pageTitle = await page.title();

      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
      });
      const screenshotBase64 = `data:image/png;base64,${Buffer.from(screenshot).toString("base64")}`;

      const links = await page.evaluate((baseHost: string) => {
        const anchors = Array.from(document.querySelectorAll("a[href]"));
        const seen = new Set<string>();
        const results: { url: string; text: string }[] = [];

        for (const a of anchors) {
          try {
            const href = new URL(
              a.getAttribute("href")!,
              window.location.origin
            );
            if (
              href.hostname === baseHost &&
              !href.hash &&
              href.pathname !== window.location.pathname &&
              !seen.has(href.pathname)
            ) {
              seen.add(href.pathname);
              const text =
                a.textContent?.trim().slice(0, 60) ||
                href.pathname.replace(/\//g, " ").trim() ||
                "Untitled";
              results.push({
                url: href.origin + href.pathname,
                text,
              });
            }
          } catch {
            // skip invalid URLs
          }
        }

        return results.slice(0, 20);
      }, parsedUrl.hostname);

      await browser.close();

      return NextResponse.json({
        currentPage: {
          url: parsedUrl.toString(),
          title: pageTitle || parsedUrl.hostname,
          image: screenshotBase64,
          width: 1440,
          height: 900,
        },
        links,
      });
    }
  } catch (error) {
    console.error("Crawl error:", error);
    return NextResponse.json(
      { error: "Failed to crawl. Check if the URL is accessible." },
      { status: 500 }
    );
  }
}
