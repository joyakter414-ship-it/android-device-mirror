async function getAccessToken(env) {
  const clientId = env.DRIVE_CLIENT_ID || '497088838020-f0cgvhh07s5ddn105pgruvthaq8k5lgg.apps.googleusercontent.com';
  const clientSecret = env.DRIVE_CLIENT_SECRET || '';
  const refreshToken = env.DRIVE_REFRESH_TOKEN || '';

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await tokenRes.json();
  if (!data.access_token) {
    throw new Error('Failed to refresh Drive token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

export async function onRequest(context) {
  try {
    const accessToken = await getAccessToken(context.env);
    const driveRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const driveData = await driveRes.json();

    return new Response(JSON.stringify({
      success: true,
      user: driveData.user,
      storageQuota: driveData.storageQuota
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
