// only inject in the dom environment
if (
  // not node runtime
  typeof window !== 'undefined' &&
  // not edge runtime
  typeof (globalThis as any).EdgeRuntime !== 'string'
) {
  // test with canvas
  // @ts-ignore - Optional dependency not installed in Docker build
  import('vitest-canvas-mock');
}
