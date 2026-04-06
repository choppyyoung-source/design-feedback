import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

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

    // Get page title
    const pageTitle = await page.title();

    // Screenshot of current page
    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    const screenshotBase64 = `data:image/png;base64,${Buffer.from(screenshot).toString("base64")}`;

    // Extract internal links
    const links = await page.evaluate((baseHost: string) => {
      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const seen = new Set<string>();
      const results: { url: string; text: string }[] = [];

      for (const a of anchors) {
        try {
          const href = new URL(a.getAttribute("href")!, window.location.origin);
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
  } catch (error) {
    console.error("Crawl error:", error);
    return NextResponse.json(
      { error: "Failed to crawl. Check if the URL is accessible." },
      { status: 500 }
    );
  }
}
