export async function onRequestGet(context) {
  try {
    const { env } = context;
    if (!env.STORAGE) {
      return new Response(JSON.stringify({ success: false, error: 'R2 STORAGE binding not available' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const listed = await env.STORAGE.list({ limit: 50 });
    const objects = listed.objects.map(o => ({
      key: o.key,
      size: o.size,
      uploaded: o.uploaded
    }));

    return new Response(JSON.stringify({ success: true, objects }), {
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
