import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { id } = await params;

    const product = await Product.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    if (error.code === 11000) {
        return NextResponse.json({ message: 'Product SKU already exists' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error updating product' }, { status: 500 });
  }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
  
      await dbConnect();
      const { id } = await params;
      
      const product = await Product.findByIdAndDelete(id);
  
      if (!product) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }
  
      return NextResponse.json({ message: 'Product deleted' });
    } catch (error) {
      return NextResponse.json({ message: 'Error deleting product' }, { status: 500 });
    }
  }
