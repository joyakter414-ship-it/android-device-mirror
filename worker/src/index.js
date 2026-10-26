export class BridgeRoom {
  constructor(state, env) {
    this.state = state;
    this.phoneWs = null;
    this.pcWs = null;
    this.phoneQueue = [];
    this.pcQueue = [];
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

      // Flush any queued PC messages to this phone
      if (this.pcQueue.length > 0) {
        for (const msg of this.pcQueue) {
          try { server.send(msg); } catch (_) {}
        }
        this.pcQueue = [];
      }
    } else if (role === "pc") {
      if (this.pcWs) {
        try { this.pcWs.close(1000, "Replaced by new PC connection"); } catch (_) {}
      }
      this.pcWs = server;
      console.log("[BridgeRoom] PC connected via WebSocket");

      // Flush any queued Phone messages to this PC
      if (this.phoneQueue.length > 0) {
        for (const msg of this.phoneQueue) {
          try { server.send(msg); } catch (_) {}
        }
        this.phoneQueue = [];
      }
    }

    // Bidirectional binary & text forwarding with safe error recovery
    server.addEventListener("message", (event) => {
      const isPhone = role === "phone";
      const target = isPhone ? this.pcWs : this.phoneWs;

      if (target && target.readyState === 1) {
        try {
          target.send(event.data);
        } catch (e) {
          console.error(`[BridgeRoom] Forward error:`, e);
        }
      } else {
        // Buffer up to 30 packets during initial handshake negotiation
        const queue = isPhone ? this.phoneQueue : this.pcQueue;
        if (queue.length < 30) {
          queue.push(event.data);
        }
      }
    });

    server.addEventListener("close", (e) => {
      console.log(`[BridgeRoom] ${role} closed: code ${e.code}`);
      if (role === "phone" && this.phoneWs === server) {
        this.phoneWs = null;
      }
      if (role === "pc" && this.pcWs === server) {
        this.pcWs = null;
        // Instantly notify phone to drop into Deep Rest Mode (0% battery drain)
        if (this.phoneWs && this.phoneWs.readyState === 1) {
          try {
            this.phoneWs.send(JSON.stringify({ action: "stream_stop", reason: "pc_disconnected" }));
          } catch (_) {}
        }
      }
    });

    server.addEventListener("error", (err) => {
      console.error(`[BridgeRoom] ${role} error:`, err);
      if (role === "pc" && this.pcWs === server) {
        this.pcWs = null;
        if (this.phoneWs && this.phoneWs.readyState === 1) {
          try {
            this.phoneWs.send(JSON.stringify({ action: "stream_stop", reason: "pc_error" }));
          } catch (_) {}
        }
      }
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
          durableObject: "Active",
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
