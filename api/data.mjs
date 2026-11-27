import { readSheet } from '../lib/sheet.mjs';

// One copy is kept for 30 seconds and shared by every visitor, so thousands of
// parents refreshing at once cause only a couple of reads of the Sheet a minute.
export async function GET() {
  try {
    return Response.json(await readSheet(), {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' }
    });
  } catch (err) {
    console.error(err.message);
    return Response.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
