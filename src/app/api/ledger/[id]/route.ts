import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Ledger from '@/models/Ledger';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await context.params; // Await params for Next.js 15
    const body = await req.json();
    const entry = await Ledger.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true
    });
    if (!entry) {
      return NextResponse.json({ success: false, message: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Ledger PATCH Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await context.params; // Await params for Next.js 15
    const entry = await Ledger.findByIdAndDelete(id);
    if (!entry) {
      return NextResponse.json({ success: false, message: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    console.error('Ledger DELETE Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
