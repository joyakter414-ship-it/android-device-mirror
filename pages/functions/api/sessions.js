export async function onRequestGet(context) {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, error: 'D1 DB binding not available' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM device_sessions ORDER BY created_at DESC LIMIT 20'
    ).all();

    return new Response(JSON.stringify({ success: true, sessions: results }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const id = body.id || 'sess_' + Date.now();
    const model = body.model || 'Android Device';
    const abi = body.abi || 'arm64-v8a';
    const ip = body.ip || 'Remote-Bridge';
    const mode = body.mode || 'Cloudflare-Worker-Tunnel';
    const status = body.status || 'CONNECTED';

    if (env.DB) {
      await env.DB.prepare(
        'INSERT INTO device_sessions (id, device_model, device_abi, ip_address, connection_mode, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, model, abi, ip, mode, status).run();
    }

    return new Response(JSON.stringify({ success: true, id }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
