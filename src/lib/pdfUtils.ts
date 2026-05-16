import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Generates a PDF from a DOM element using client-side libraries.
 * This is a lightweight replacement for server-side Puppeteer.
 */
export const downloadPDF = async (elementId: string, filename: string = 'invoice.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found:', elementId);
        return;
    }

    try {
        // 1. Capture element as high-res PNG
        // We use a higher scale for better quality in the PDF
        const dataUrl = await toPng(element, { 
            quality: 1.0, 
            pixelRatio: 2,
            backgroundColor: '#ffffff'
        });

        // 2. Create PDF
        // Determine orientation
        const img = new Image();
        img.src = dataUrl;
        
        await new Promise((resolve) => {
            img.onload = resolve;
        });

        const pdf = new jsPDF({
            orientation: img.width > img.height ? 'l' : 'p',
            unit: 'px',
            format: [img.width, img.height]
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
        pdf.save(filename);
        
        return true;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        return false;
    }
};
