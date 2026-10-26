export async function onRequest(context) {
  const { request } = context;
  const cf = request.cf || {};

  return new Response(JSON.stringify({
    status: 'online',
    platform: 'Cloudflare Pages (Edge)',
    project: 'hector',
    domain: 'hector-drt.pages.dev',
    colo: cf.colo || 'GLOBAL',
    country: cf.country || 'GLOBAL',
    workerRelay: 'wss://phone-adb-bridge.joyakter414.workers.dev/ws',
    googleDriveConnected: true,
    targetAccount: 'joyakter414@gmail.com',
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
