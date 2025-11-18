import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

async function fetchExternalImage(latitude: number, longitude: number) {
  // This external service enqueues a job and requires polling for result.
  const base = "https://api.infuseting.fr";
  try {
    const enqueue = await fetch(`${base}/mapsimage/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude }),
    });
    if (!enqueue.ok) {
      const txt = await enqueue.text().catch(() => "");
      throw new Error(`external enqueue error ${enqueue.status} ${txt}`);
    }
    const j = await enqueue.json().catch(() => null);
    const jobId = j?.job_id || j?.jobId || null;
    if (!jobId) throw new Error('external api did not return job_id');

    // poll status
    const pollInterval = 1000; // ms
    const maxTimeout = 30000; // ms total
    const maxAttempts = Math.max(1, Math.floor(maxTimeout / pollInterval));
    let attempt = 0;
    let statusObj: any = null;
    while (attempt < maxAttempts) {
      attempt += 1;
      const st = await fetch(`${base}/image/${encodeURIComponent(jobId)}/status`);
      if (!st.ok) {
        // if 404 or other, break
        const txt = await st.text().catch(() => "");
        throw new Error(`external status error ${st.status} ${txt}`);
      }
      statusObj = await st.json().catch(() => null);
      const s = (statusObj && statusObj.status) || null;
      if (s === 'done') break;
      if (s === 'failed') {
        throw new Error(`external job failed: ${statusObj.error || JSON.stringify(statusObj)}`);
      }
      // still queued/processing -> wait
      await new Promise((res) => setTimeout(res, pollInterval));
    }

    if (!statusObj || statusObj.status !== 'done') {
      throw new Error('external job did not complete in time');
    }
    
    const resultRes = await fetch(`${base}/image/${encodeURIComponent(jobId)}/result`);
    if (!resultRes.ok) {
      const txt = await resultRes.text().catch(() => "");
      throw new Error(`external result error ${resultRes.status} ${txt}`);
    }
    const contentType = (resultRes.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await resultRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const b64 = buffer.toString('base64');
    const mime = contentType.split(';')[0] || 'image/png';
    return { image_base64: b64, mime };
  } catch (err) {
    throw err;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || url.searchParams.get("idInfrastructure");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const rows = await query(
      "SELECT image_base64, latitude, longitude FROM Infrastructure WHERE idInfrastructure = ? LIMIT 1",
      [id]
    );
    if (!rows || rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

    const infra: any = rows[0];

    if (infra.image_base64) {
      return NextResponse.json({ image_base64: infra.image_base64 }, { status: 200 });
    }

    const lat = infra.latitude ? parseFloat(infra.latitude) : null;
    const lon = infra.longitude ? parseFloat(infra.longitude) : null;
    if (lat == null || isNaN(lat) || lon == null || isNaN(lon)) {
      return NextResponse.json({ error: "missing coordinates" }, { status: 400 });
    }

    // Call external image API
    const external = await fetchExternalImage(lat, lon);
    if (!external) return NextResponse.json({ error: "external api returned invalid data" }, { status: 502 });

    // Try to save into DB if possible. If the column doesn't exist this will fail and be logged.
    try {
      if (external.image_base64) {
        await query("UPDATE Infrastructure SET image_base64 = ? WHERE idInfrastructure = ?", [external.image_base64, id]);
      }
    } catch (err: any) {
      // don't fail the request for DB update errors; just log
      // eslint-disable-next-line no-console
      console.warn("Failed to update Infrastructure.image_base64", { id, err: err?.message ?? err });
    }

    return NextResponse.json(external, { status: 200 });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("infra image api error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Accept body with { id } or { idInfrastructure }
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id || body.idInfrastructure;
    if (!id) return NextResponse.json({ error: "missing id in body" }, { status: 400 });

    // Delegate to GET-like logic by building a fake URL with query param
    const fakeUrl = `${req.url.split("/api/")[0]}/api/infra/image?id=${encodeURIComponent(id)}`;
    return GET(new Request(fakeUrl, { method: "GET", headers: req.headers }));
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("infra image POST error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
