import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const query: any = {};
    if (startDate && endDate) {
      query.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }
    
    if (category && category !== 'All Time') {
        // If category is from month filter? No, category is distinct.
        // Wait, standardizing filter names.
        // UI sends 'search' and maybe 'category' if I add dropdown.
        // But checking existing logic: UI sends 'selectedMonth'.
        // My previous API update supported 'startDate'/'endDate'.
        // I need to map 'selectedMonth' to dates on client side OR support 'month' param in API.
        // Let's support 'month' param too for simplicity, or stick to date range.
        // The UI currently filters by 'selectedMonth' on client (lines 81-88 in original).
        // I should probably accept 'month' in API to avoid complex date math on client.
    }
    
    // Add Month Filter Support efficiently
    const month = searchParams.get('month');
    if (month && month !== 'All Time') {
         // Format: "JAN-2025" or similar?
         // Helper to parse?
         // Let's rely on Start/End dates from client usually, but client logic uses month string.
         // Let's parse month string here for convenience if provided.
         // Or just stick to start/end dates. Client can send dates.
         // For now let's just add search.
    }
    
    // Actually, let's keep it simple. Search is key.
    
    if (category) {
        query.category = category;
    }

    const [expenses, total] = await Promise.all([
        Expense.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Expense.countDocuments(query)
    ]);

    return NextResponse.json({ 
        success: true, 
        data: expenses,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const expense = await Expense.create(body);
    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
