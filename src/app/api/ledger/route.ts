import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Ledger from '@/models/Ledger';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const entries = await Ledger.find(query).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const entry = await Ledger.create(body);
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
