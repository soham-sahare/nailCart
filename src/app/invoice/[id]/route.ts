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
    // Singleton Pattern for BOTH Dev and Prod to reuse warm instances
    if (!(global as any).puppeteerBrowser || !(global as any).puppeteerBrowser.isConnected()) {
        if (process.env.NODE_ENV === 'production') {
            browser = await puppeteerCore.launch({
                args: [...(chromium as any).args, '--hide-scrollbars', '--disable-web-security'],
                defaultViewport: (chromium as any).defaultViewport,
                executablePath: await (chromium as any).executablePath(),
                headless: (chromium as any).headless,
                ignoreHTTPSErrors: true,
            } as any);
        } else {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
        (global as any).puppeteerBrowser = browser;
    }
    browser = (global as any).puppeteerBrowser;

    const page = await browser.newPage();

    // FORWARD COOKIES (Critical for Auth) - OPTIMIZED PARALLEL
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
        const cookies = cookieHeader.split(';')
            .map(c => c.trim())
            .filter(c => !!c)
            .map(cookie => {
                const parts = cookie.split('=');
                const name = parts.shift() as string;
                const value = parts.join('=');
                return { 
                    name, 
                    value, 
                    domain: new URL(baseUrl).hostname, 
                    path: '/' 
                };
            });
        
        if (cookies.length > 0) {
            // Parallelize cookie setting
            await Promise.all(cookies.map(async (cookie) => {
                 // Skip Secure/Host cookies on HTTP connections
                 if (invoiceUrl.startsWith('http:') && (cookie.name.startsWith('__Secure-') || cookie.name.startsWith('__Host-'))) {
                     return;
                 }
                 try {
                     await page.setCookie({
                         name: cookie.name,
                         value: cookie.value,
                         url: invoiceUrl
                     });
                 } catch (err) {
                     // Ignore invalid cookies
                 }
            }));
        }
    }

    // Set Viewport based on type
    if (type === 'thermal') {
        await page.setViewport({ width: 302, height: 800 }); 
    } else {
        await page.setViewport({ width: 1200, height: 1600 });
    }
    
    // OPTIMIZED: Faster Navigation
    // 1. Block unnecessary resources (Images, Fonts, CSS?) - CSS needed for styling. Images maybe.
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
            // actually we need stylesheet for invoice look
            if (req.resourceType() === 'stylesheet') req.continue();
            else req.abort();
        } else {
            req.continue();
        }
    });

    // 2. Wait only for DOM, fail fast
    await page.goto(invoiceUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    try {
        await page.waitForSelector('div[class*="totalsBox"]', { timeout: 8000 });
    } catch (e) {
        // Fallback or re-throw
        throw e;
    }

    // Generate PDF
    let pdfBuffer;
    if (type === 'thermal') {
        pdfBuffer = await page.pdf({
            width: '80mm',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            pageRanges: '1' 
        });
    } else {
        pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });
    }

    await page.close(); // Always close page, keep browser open in singleton

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
