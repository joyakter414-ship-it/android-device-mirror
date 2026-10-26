export async function onRequest(context) {
  const { request } = context;

  // Handle CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();

    // Authenticate with user's designated credentials
    const VALID_EMAIL = "joyakter414@gmail.com";
    const VALID_PASS = "qwer4321";

    if (email === VALID_EMAIL && password === VALID_PASS) {
      // Create session auth token
      const sessionToken = "hector_sec_" + btoa(`${email}:${Date.now()}:joy_authorized`);

      return new Response(JSON.stringify({
        success: true,
        token: sessionToken,
        user: {
          email: VALID_EMAIL,
          role: "owner",
          authenticatedAt: new Date().toISOString()
        }
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: "ভুল ইমেইল বা পাসওয়ার্ড! অ্যাক্সেস ডিনাইড।"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: "Invalid request payload: " + err.message
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
