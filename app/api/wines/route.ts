import { NextRequest, NextResponse } from 'next/server';
import { getWines, saveWine, replaceAllWines } from '@/lib/db';
import { Wine } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.toLowerCase() || '';
    const verdict = searchParams.get('verdict');
    const type = searchParams.get('type');
    const favorite = searchParams.get('favorite') === 'true';
    const wishlist = searchParams.get('wishlist') === 'true';

    let wines = await getWines();

    if (search) {
      wines = wines.filter((w) =>
        w.name.toLowerCase().includes(search) ||
        w.producer.toLowerCase().includes(search) ||
        w.grape.toLowerCase().includes(search) ||
        w.region.toLowerCase().includes(search) ||
        w.country.toLowerCase().includes(search) ||
        w.purchase?.store.toLowerCase().includes(search)
      );
    }

    if (verdict && verdict !== 'all') {
      wines = wines.filter((w) => w.coupleVerdict === verdict);
    }

    if (type && type !== 'all') {
      wines = wines.filter((w) => w.type === type);
    }

    if (favorite) {
      wines = wines.filter((w) => w.favorite);
    }

    if (wishlist) {
      wines = wines.filter((w) => w.wishlist);
    }

    return NextResponse.json({ success: true, wines });
  } catch (error) {
    console.error('API /api/wines GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch wines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support bulk import array
    if (Array.isArray(body.wines)) {
      const savedList = await replaceAllWines(body.wines);
      return NextResponse.json({ success: true, wines: savedList }, { status: 200 });
    }

    if (!body.name || !body.producer) {
      return NextResponse.json(
        { success: false, error: 'Wine Name and Producer are required' },
        { status: 400 }
      );
    }

    const newWine: Wine = {
      id: body.id || `wine-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: body.name,
      producer: body.producer,
      vintage: body.vintage || 'NV',
      type: body.type || 'red',
      grape: body.grape || '',
      region: body.region || '',
      country: body.country || '',
      abv: body.abv || '',
      imageUrl: body.imageUrl || '',
      coupleVerdict: body.coupleVerdict || 'good',
      averageRating: Number(body.averageRating) || 4.0,
      tastedTogether: body.tastedTogether ?? true,
      partner1Review: body.partner1Review,
      partner2Review: body.partner2Review,
      jointNotes: body.jointNotes || '',
      body: body.body ?? 3,
      sweetness: body.sweetness ?? 1,
      tannin: body.tannin ?? 3,
      acidity: body.acidity ?? 3,
      aromaTags: body.aromaTags || [],
      foodPairings: body.foodPairings || [],
      purchase: {
        store: body.purchase?.store || 'Local Store',
        price: Number(body.purchase?.price) || 0,
        currency: body.purchase?.currency || '£',
        date: body.purchase?.date || new Date().toISOString().split('T')[0],
        isSpecialOffer: body.purchase?.isSpecialOffer || false,
        notes: body.purchase?.notes || '',
      },
      onlineLinks: body.onlineLinks || {},
      wishlist: body.wishlist || false,
      favorite: body.favorite || false,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveWine(newWine);
    return NextResponse.json({ success: true, wine: saved }, { status: 201 });
  } catch (error) {
    console.error('API /api/wines POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save wine' }, { status: 500 });
  }
}
