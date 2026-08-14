export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  STATUS_CACHE: KVNamespace;
}

// D1/KV in this Worker must only ever hold non-sensitive metadata (IDs, timestamps,
// status flags). Transcripts, SOAP notes, and embeddings stay on the local device.

interface VisitEvent {
  patient_ref_id: string;
  staff_id: string;
  scheduled_at: string;
  status?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/visits" && request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT id, patient_ref_id, staff_id, scheduled_at, status, sync_status, created_at FROM visit_events ORDER BY scheduled_at DESC LIMIT 50"
      ).all();
      return json({ visits: results });
    }

    if (url.pathname === "/api/visits" && request.method === "POST") {
      const body = await request.json<VisitEvent>().catch(() => null);
      if (!body?.patient_ref_id || !body?.staff_id || !body?.scheduled_at) {
        return json({ error: "patient_ref_id, staff_id, scheduled_at are required" }, 400);
      }
      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO visit_events (id, patient_ref_id, staff_id, scheduled_at, status) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(id, body.patient_ref_id, body.staff_id, body.scheduled_at, body.status ?? "scheduled")
        .run();
      return json({ id }, 201);
    }

    if (url.pathname === "/api/status" && request.method === "GET") {
      const value = await env.STATUS_CACHE.get("last_sync");
      return json({ last_sync: value });
    }

    if (url.pathname === "/api/status" && request.method === "PUT") {
      const body = await request.json<{ last_sync?: string }>().catch(() => null);
      const value = body?.last_sync ?? new Date().toISOString();
      await env.STATUS_CACHE.put("last_sync", value, { expirationTtl: 86400 });
      return json({ last_sync: value });
    }

    return env.ASSETS.fetch(request);
  },
};
