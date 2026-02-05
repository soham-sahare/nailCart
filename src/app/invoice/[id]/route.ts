import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || searchParams.get('mode') || 'a4'; // 'a4' or 'thermal'

  try {
    // Determine Base URL
    // Priority: 
    // 1. NEXT_PUBLIC_APP_URL (Manual override)
    // 2. VERCEL_URL (Automatically set by Vercel)
    // 3. Request Header (Host) - Most reliable dynamic fallback
    
    let domain = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;

    if (!domain && process.env.VERCEL_URL) {
        domain = `https://${process.env.VERCEL_URL}`;
    }

    // Fallback: Use the incoming request's host
    if (!domain) {
      const host = req.headers.get('host');
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      if (host) domain = `${protocol}://${host}`;
    }

    const baseUrl = domain || 'http://localhost:3000';
    const invoiceUrl = `${baseUrl}/invoice/${id}/html?mode=${type}`;

    console.log(`Generating PDF for: ${invoiceUrl}`);

    let browser;
    if (process.env.NODE_ENV === 'production') {
        // PRODUCTION: Use @sparticuz/chromium and puppeteer-core
        browser = await puppeteerCore.launch({
            args: (chromium as any).args,
            defaultViewport: (chromium as any).defaultViewport,
            executablePath: await (chromium as any).executablePath(),
            headless: (chromium as any).headless,
        });
    } else {
        // DEVELOPMENT: Use standard puppeteer with singleton pattern
        if (!(global as any).puppeteerBrowser || !(global as any).puppeteerBrowser.isConnected()) {
            (global as any).puppeteerBrowser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
        browser = (global as any).puppeteerBrowser;
    }

    const page = await browser.newPage();

    // FORWARD COOKIES (Critical for Auth)
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(cookie => {
            const [name, ...value] = cookie.trim().split('=');
            return { name, value: value.join('='), url: baseUrl };
        });
        await page.setCookie(...cookies);
    }

    // DEBUG: Log console messages from the page
    page.on('console', (msg: any) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err: any) => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', (request: any) => console.log(`PAGE REQUEST FAILED: ${request.url()} ${request.failure()?.errorText}`));

    // Set Viewport based on type
    if (type === 'thermal') {
        await page.setViewport({ width: 302, height: 800 }); // ~80mm width (302px at 96dpi approx)
    } else {
        await page.setViewport({ width: 1200, height: 1600 }); // A4 Ratio
    }
    
    // OPTIMIZED: Wait for the specific content selector (Much faster than networkidle0)
    // We wait for the totals box which renders after data is fetched.
    await page.goto(invoiceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check if error message appeared
    try {
        await page.waitForSelector('div[class*="totalsBox"]', { timeout: 10000 });
    } catch (e) {
        // If timeout, check if we have an error message on page
        const content = await page.content();
        console.log('PDF TIMEOUT. Page Content Dump:', content.slice(0, 500)); // Log first 500 chars to check for error text
        throw e;
    }

    // Generate PDF
    let pdfBuffer;
    if (type === 'thermal') {
        pdfBuffer = await page.pdf({
            width: '80mm',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            pageRanges: '1' // Thermal usually continuous
        });
    } else {
        pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });
    }

    if (process.env.NODE_ENV === 'production') {
        await browser.close();
    } else {
        await page.close(); // Only close the tab, keep browser open in dev
    }

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
