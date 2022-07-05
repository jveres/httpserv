/**
 * Copyright 2022 Janos Veres. All rights reserved.
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file.
 */

import { listen } from "../mod.ts";
import { delay } from "https://deno.land/std@0.146.0/async/mod.ts";

const PORT = 8080;
const HOSTNAME = "127.0.0.1";
const HTML = Deno.readTextFileSync("index.html");
const CACHE_TTL = 48 * 60 * 60 * 1000; // 48 hours

const server = listen(PORT, HOSTNAME);

server.expose({
  path: "/bench",
  handler: () => {
    return new Response("Hello from API!");
  },
});

server.expose({
  path: "/id/:id",
  method: "POST",
  handler: ({ urlParams, routeParams }) => {
    console.log("urlParams: ", urlParams);
    console.log("routeParams: ", routeParams);
    return new Response("[ID] Hello from API!");
  },
});

server.expose({
  path: "/path/**",
  handler: ({ urlParams, routeParams }) => {
    console.log("urlParams: ", urlParams);
    console.log("routeParams: ", routeParams);
    return new Response("[PATH] Hello from API!");
  },
});

server.expose({
  path: "/",
  handler: () => {
    return new Response(HTML, {
      headers: {
        "content-type": "text/html",
        "cache-control": `public, max-age=${CACHE_TTL / 1000};`,
      },
    });
  },
});

server.expose({
  path: "/chunked",
  handler: () => {
    const chunks = (async function* () {
      yield "Hello from API!\n\n";
      for (let i = 1; i <= 10; i++) {
        await delay(1000);
        yield i + "\n\n";
      }
    })();
    const stream = new ReadableStream({
      pull(controller) {
        return chunks.next()
          .then(({ value, done }) => {
            if (done === true) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          });
      },
    });
    return new Response(
      stream.pipeThrough(new TextEncoderStream()),
      {
        headers: {
          "cache-control": "no-store",
          "content-type": "text/plain",
        },
      },
    );
  },
});

server.expose({
  path: "/ws",
  handler: ({ request }) => {
    if (request.headers.get("upgrade") !== "websocket") {
      return new Response(null, { status: 501 });
    }
    const stream = (async function* () {
      for (let i = 1; i <= 10; i++) {
        await delay(1000);
        yield i + "\n\n";
      }
    })();
    const { socket, response } = Deno.upgradeWebSocket(request);
    socket.onopen = async () => {
      console.log("websocket connected");
      socket.send("Hello from API!");
      try {
        for await (const data of stream) {
          if (socket.readyState === WebSocket.OPEN) socket.send(data);
          else break;
        }
      } catch (e) {
        console.error("websocket error:", e);
      } finally {
        socket.close();
      }
    };
    socket.onmessage = ({ data }) => {
      console.info("websocket message reveiced:", data);
    };
    socket.onclose = () => {
      console.log("websocket closed");
    };
    socket.onerror = (e) => console.error("websocket error:", e);
    return response;
  },
});

console.log(`Server is listening on port: ${PORT}`);
