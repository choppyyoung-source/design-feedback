import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Basic URL validation
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

    // Wait a bit for animations/lazy loading
    await new Promise((r) => setTimeout(r, 1000));

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    await browser.close();

    // Return as base64 data URL
    const base64 = Buffer.from(screenshot).toString("base64");
    return NextResponse.json({
      image: `data:image/png;base64,${base64}`,
      width: 1440,
      height: 900,
      sourceUrl: parsedUrl.toString(),
    });
  } catch (error) {
    console.error("Screenshot error:", error);
    return NextResponse.json(
      { error: "Failed to capture screenshot. Check if the URL is accessible." },
      { status: 500 }
    );
  }
}
