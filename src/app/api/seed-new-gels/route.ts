import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';

export const maxDuration = 300; 

export async function GET() {
  try {
    await dbConnect();

    // Find Category
    let category = await Category.findOne({ name: 'GEL POLISHES' });
    if (!category) {
         // Create if missing (fallback)
         category = await Category.create({ 
            name: 'GEL POLISHES', 
            status: 'ACTIVE',
            slug: 'gel-polishes'
         });
    }
    const categoryId = category._id;

    const datasets = [
  { name: 'SHILLS GEL POLISH', prefix: 'SHILLS', start: 1, end: 430, cp: 225, sp: 250, mrp: 499 },
  { name: 'VENALISA GEL POLISH', prefix: 'VENALISA', start: 1, end: 193, cp: 140, sp: 200, mrp: 450 },
  { name: 'KULIS GEL POLISH', prefix: 'KULIS', start: 1, end: 150, cp: 75, sp: 130, mrp: 200 },
  { name: 'VINIMAY JELLY GEL', prefix: 'VINIMAY-JELLY', start: 1, end: 36, cp: 175, sp: 235, mrp: 500 },
  { name: 'KULIS N SERIES', prefix: 'KULIS-N', start: 1, end: 49, cp: 75, sp: 130, mrp: 200 },
  { name: 'KULIS GLITTER GEL', prefix: 'KULIS-GLITTER', start: 1, end: 36, cp: 100, sp: 150, mrp: 250 },
  { name: 'KULIS BROKEN DIAMOND GEL', prefix: 'KULIS-BROKEN', start: 1, end: 12, cp: 220, sp: 300, mrp: 799 },
  { name: 'KULIS CLOUD CAT EYE', prefix: 'KULIS-CLOUD', start: 1, end: 9, cp: 175, sp: 230, mrp: 599 },
  { name: 'KULIS GLASS BEAD CAT EYE', prefix: 'KULIS-GLASS', start: 1, end: 7, cp: 175, sp: 230, mrp: 599 },
  { name: 'VENALISA ICE GEL', prefix: 'VENALISA-ICE', start: 1, end: 8, cp: 170, sp: 200, mrp: 300 },
  { name: 'VENALISA SILK ICE GEL', prefix: 'VENALISA-SILK', start: 1, end: 8, cp: 160, sp: 200, mrp: 300 },
  { name: 'VENALISA PLATINUM ICE GEL', prefix: 'VENALISA-PLATINUM-ICE', start: 1, end: 6, cp: 160, sp: 200, mrp: 300 },
  { name: 'VENALISA CRACK GEL', prefix: 'VENALISA-CRACK', start: 1, end: 7, cp: 120, sp: 175, mrp: 250 },
  { name: 'VENALISA PLATINUM GEL', prefix: 'VENALISA-PLATINUM', start: 1, end: 6, cp: 160, sp: 200, mrp: 250 },
  { name: 'VENALISA DISCO GEL', prefix: 'VENALISA-DISCO', start: 1, end: 8, cp: 140, sp: 200, mrp: 300 }
];

    let totalInserted = 0;
    const errors: any[] = [];

    for (const set of datasets) {
        const productsToInsert = [];
        for (let i = set.start; i <= set.end; i++) {
            // SKU format: Prefix + Number (e.g., "KULIS-GLITTER-1")
            const sku = `${set.prefix}-${i}`;

            productsToInsert.push({
                name: set.name,
                sku: sku,
                category: categoryId,
                costPrice: set.cp,
                sellingPrice: set.sp,
                mrp: set.mrp,
                quantity: 0,
                status: 'ACTIVE',
                description: `Auto-generated ${set.name} #${sku}`
            });
        }

        try {
            // Use ordered: false to skip duplicates
            const docs = productsToInsert.map(p => ({...p}));
            const result = await Product.insertMany(docs, { ordered: false });
            totalInserted += result.length;
        } catch (err: any) {
            if (err.writeErrors) {
                 totalInserted += err.insertedDocs.length;
            } else {
                errors.push({ set: set.name, error: err.message });
            }
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Seeding complete. Inserted ${totalInserted} products.`,
        errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Seeding Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
