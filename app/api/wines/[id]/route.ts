import { NextRequest, NextResponse } from 'next/server';
import { getWineById, saveWine, deleteWine } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wine = await getWineById(id);
    if (!wine) {
      return NextResponse.json({ success: false, error: 'Wine not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, wine });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch wine' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getWineById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Wine not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await saveWine({
      ...existing,
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, wine: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update wine' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteWine(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Wine not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Wine deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete wine' }, { status: 500 });
  }
}
