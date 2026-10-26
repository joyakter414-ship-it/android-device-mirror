export class BridgeRoom {
  constructor(state, env) {
    this.state = state;
    this.phoneWs = null;
    this.pcWs = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const role = url.searchParams.get("role"); // "phone" or "pc"
    if (role !== "phone" && role !== "pc") {
      return new Response("Invalid role. Must be 'phone' or 'pc'", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    if (role === "phone") {
      if (this.phoneWs) {
        try { this.phoneWs.close(1000, "Replaced by new phone connection"); } catch (_) {}
      }
      this.phoneWs = server;
      console.log("[BridgeRoom] Phone connected via WebSocket");
    } else if (role === "pc") {
      if (this.pcWs) {
        try { this.pcWs.close(1000, "Replaced by new PC connection"); } catch (_) {}
      }
      this.pcWs = server;
      console.log("[BridgeRoom] PC connected via WebSocket");
    }

    // Bidirectional binary & text forwarding
    server.addEventListener("message", (event) => {
      const target = role === "phone" ? this.pcWs : this.phoneWs;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(event.data);
      }
    });

    server.addEventListener("close", (e) => {
      console.log(`[BridgeRoom] ${role} closed: code ${e.code}`);
      if (role === "phone" && this.phoneWs === server) {
        this.phoneWs = null;
      }
      if (role === "pc" && this.pcWs === server) {
        this.pcWs = null;
      }
    });

    server.addEventListener("error", (err) => {
      console.error(`[BridgeRoom] ${role} error:`, err);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "Android Zero-App ADB Remote Bridge",
          author: "Device Mirror System",
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    if (url.pathname === "/ws") {
      const token = url.searchParams.get("token");
      if (!token || token.length < 8) {
        return new Response("Unauthorized: Valid token parameter required", { status: 401 });
      }

      const id = env.BRIDGE_ROOM.idFromName(token);
      const stub = env.BRIDGE_ROOM.get(id);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
