declare module 'node-fetch' {
  const fetch: typeof globalThis.fetch;
  export default fetch;
  export type Response = globalThis.Response;
  export type RequestInit = globalThis.RequestInit;
}
