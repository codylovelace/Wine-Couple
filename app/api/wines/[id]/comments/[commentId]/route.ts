import { NextRequest, NextResponse } from 'next/server';
import { updateWine, WineNotFoundError } from '@/lib/db';
import { withUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

class NotYourCommentError extends Error {}

// People can delete their own comments only.
export const DELETE = withUser(
  async (_request: NextRequest, user, { params }: { params: Promise<{ id: string; commentId: string }> }) => {
    const { id, commentId } = await params;
    try {
      const wine = await updateWine(id, user.id, (w) => {
        const comment = w.comments?.find((c) => c.id === commentId);
        if (!comment) throw new WineNotFoundError();
        if (comment.authorId !== user.id) throw new NotYourCommentError();
        w.comments = w.comments!.filter((c) => c.id !== commentId);
      });
      return NextResponse.json({ success: true, wine });
    } catch (error) {
      if (error instanceof WineNotFoundError) {
        return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
      }
      if (error instanceof NotYourCommentError) {
        return NextResponse.json({ success: false, error: 'You can only delete your own comments.' }, { status: 403 });
      }
      console.error('Comment DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete comment' }, { status: 500 });
    }
  }
);
