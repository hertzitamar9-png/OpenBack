import http, { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

export interface HostedProxyTarget {
  path: string;
  port: number;
}

const MASTER_PORT = 3000;
const FIRST_WORKER_PORT = 3001;

/**
 * Resolve the public single-port request to the same internal service that the
 * production nginx configuration uses.
 */
export function resolveHostedProxyTarget(
  requestUrl: string,
  numWorkers: number,
  createGameWorker = 0,
): HostedProxyTarget {
  const workerMatch = requestUrl.match(/^\/w(\d+)(\/.*|\?.*)?$/);
  if (workerMatch) {
    const requestedWorker = Number.parseInt(workerMatch[1], 10);
    const worker =
      Number.isInteger(requestedWorker) && requestedWorker < numWorkers
        ? requestedWorker
        : 0;
    return {
      path: workerMatch[2] ?? "/",
      port: FIRST_WORKER_PORT + worker,
    };
  }

  const pathname = requestUrl.split("?", 1)[0];
  if (
    pathname === "/api/create_game" ||
    pathname === "/api/adminbot/create_game"
  ) {
    const worker = Math.abs(createGameWorker) % numWorkers;
    return { path: requestUrl, port: FIRST_WORKER_PORT + worker };
  }

  return { path: requestUrl, port: MASTER_PORT };
}

function proxyHeaders(request: IncomingMessage): http.OutgoingHttpHeaders {
  return {
    ...request.headers,
    "x-forwarded-for":
      request.headers["x-forwarded-for"] ?? request.socket.remoteAddress ?? "",
    "x-forwarded-host": request.headers.host ?? "",
    "x-forwarded-proto": "https",
  };
}

export function startHostedProxy(
  port: number,
  numWorkers: number,
): http.Server {
  let nextCreateGameWorker = 0;
  const targetFor = (requestUrl: string) => {
    const target = resolveHostedProxyTarget(
      requestUrl,
      numWorkers,
      nextCreateGameWorker,
    );
    if (
      requestUrl.startsWith("/api/create_game") ||
      requestUrl.startsWith("/api/adminbot/create_game")
    ) {
      nextCreateGameWorker = (nextCreateGameWorker + 1) % numWorkers;
    }
    return target;
  };

  const server = http.createServer(
    (request: IncomingMessage, response: ServerResponse) => {
      const target = targetFor(request.url ?? "/");
      const upstream = http.request(
        {
          headers: proxyHeaders(request),
          hostname: "127.0.0.1",
          method: request.method,
          path: target.path,
          port: target.port,
        },
        (upstreamResponse) => {
          response.writeHead(
            upstreamResponse.statusCode ?? 502,
            upstreamResponse.headers,
          );
          upstreamResponse.pipe(response);
        },
      );
      upstream.on("error", () => {
        if (!response.headersSent) response.writeHead(502);
        response.end("OpenBack is starting. Please retry in a moment.");
      });
      request.pipe(upstream);
    },
  );

  server.on("upgrade", (request, clientSocket: Socket, head) => {
    const target = targetFor(request.url ?? "/");
    const upstream = http.request({
      headers: proxyHeaders(request),
      hostname: "127.0.0.1",
      method: request.method,
      path: target.path,
      port: target.port,
    });

    upstream.on("upgrade", (upstreamResponse, upstreamSocket, upstreamHead) => {
      const headers = Object.entries(upstreamResponse.headers)
        .flatMap(([name, value]) =>
          (Array.isArray(value) ? value : [value]).map(
            (entry) => `${name}: ${entry}`,
          ),
        )
        .join("\r\n");
      clientSocket.write(
        `HTTP/1.1 ${upstreamResponse.statusCode ?? 101} ${upstreamResponse.statusMessage ?? "Switching Protocols"}\r\n${headers}\r\n\r\n`,
      );
      if (upstreamHead.length > 0) clientSocket.write(upstreamHead);
      if (head.length > 0) upstreamSocket.write(head);
      upstreamSocket.pipe(clientSocket).pipe(upstreamSocket);
    });
    upstream.on("response", (upstreamResponse) => {
      clientSocket.write(
        `HTTP/1.1 ${upstreamResponse.statusCode ?? 502} ${upstreamResponse.statusMessage ?? "Bad Gateway"}\r\n\r\n`,
      );
      clientSocket.destroy();
    });
    upstream.on("error", () => clientSocket.destroy());
    upstream.end();
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Hosted proxy listening on port ${port}`);
  });
  return server;
}
