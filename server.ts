/**
 * Copyright 2022 Janos Veres. All rights reserved.
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file.
 */

import {
  createRouter,
  RadixRouter,
} from "https://cdn.skypack.dev/radix3@0.1.2?dts";

export function listen(port: number, hostname: string) {
  const listener = Deno.listen({ port, hostname });

  type Handler = ({ request, urlParams, routeParams }: {
    request: Request;
    urlParams?: string;
    routeParams?: Record<string, unknown>;
  }) => Response | Promise<Response>;

  const router: Record<string, RadixRouter<{ handler: Handler }>> = {};

  (async () => {
    for await (const conn of listener) {
      (async () => {
        const req = Deno.serveHttp(conn)[Symbol.asyncIterator]();
        while (true) {
          const { value: http, done } = await req.next();
          if (done) break;
          // deno-fmt-ignore
          const [path, urlParams] = http.request.url.split(http.request.headers.get("host")!, 2)[1].split("?");
          const route = router[http.request.method].lookup(path);
          http.respondWith(
            route?.handler({
              request: http.request,
              urlParams,
              routeParams: route.params,
            }) ||
              new Response(null, { status: 404 }),
          ).catch((_) => {});
        }
      })();
    }
  })();

  return {
    listener,
    expose(
      { path, method = "GET", handler }: {
        path: string;
        method?: string;
        handler: Handler;
      },
    ) {
      if (!router[method]) router[method] = createRouter();
      router[method].insert(path, { handler });
    },
  };
}
