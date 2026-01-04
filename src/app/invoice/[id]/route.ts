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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const invoiceUrl = `${baseUrl}/invoice/${id}/html?mode=${type}`;

    console.log(`Generating PDF for: ${invoiceUrl}`);

    let browser;
    if (process.env.NODE_ENV === 'production') {
        // PRODUCTION: Use @sparticuz/chromium and puppeteer-core
        browser = await puppeteerCore.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        // DEVELOPMENT: Use standard puppeteer with singleton pattern
        if (!(global as any).puppeteerBrowser) {
            (global as any).puppeteerBrowser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
        browser = (global as any).puppeteerBrowser;
    }

    const page = await browser.newPage();

    // Set Viewport based on type
    if (type === 'thermal') {
        await page.setViewport({ width: 302, height: 800 }); // ~80mm width (302px at 96dpi approx)
    } else {
        await page.setViewport({ width: 1200, height: 1600 }); // A4 Ratio
    }
    
    // OPTIMIZED: Wait for the specific content selector (Much faster than networkidle0)
    // We wait for the totals box which renders after data is fetched.
    await page.goto(invoiceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('div[class*="totalsBox"]', { timeout: 10000 });

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
