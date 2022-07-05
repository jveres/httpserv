# httpserv
Tiny and fast http server for Deno

### Static route example
```typescript
const server = listen(PORT, HOSTNAME);

server.expose({
  path: "/api",
  handler: () => {
    return new Response("Hello from Api!");
  },
});
```

### Named route example

```typescript
server.expose({
  path: "/id/:id",
  method: "POST",
  handler: ({ searchString, urlParams }) => {
    console.log("searchString: ", searchString);
    console.log("urlParams: ", urlParams);
    return new Response("Hello from Api!");
  },
});
```

### Wildcard route example

```typescript
server.expose({
  path: "/path/**",
  handler: ({ searchString, urlParams }) => {
    console.log("searchString: ", searchString);
    console.log("urlParams: ", urlParams);
    return new Response("Hello from Api!");
  },
});
```

Uses [Radix3](https://github.com/unjs/radix3) router.