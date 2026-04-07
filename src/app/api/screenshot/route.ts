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
    let browser;

    if (process.env.VERCEL) {
      // Vercel serverless: use chromium-min + puppeteer-core
      const chromium = (await import("@sparticuz/chromium-min")).default;
      const puppeteerCore = (await import("puppeteer-core")).default;
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: { width: 1440, height: 900 },
        executablePath: await chromium.executablePath(
          "https://github.com/nichochar/chromium-bidi/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
        ),
        headless: true,
      });
    } else {
      // Local: use full puppeteer
      const puppeteer = (await import("puppeteer")).default;
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(parsedUrl.toString(), {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    await new Promise((r) => setTimeout(r, 1000));

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    await browser.close();

    const base64 = Buffer.from(screenshot as Buffer).toString("base64");
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
