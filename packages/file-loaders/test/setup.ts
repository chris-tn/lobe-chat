// Polyfill DOMMatrix for pdfjs-dist in Node.js environment
// @napi-rs/canvas is an optional dependency that may not be installed
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DOMMatrix } = require('@napi-rs/canvas');

  if (typeof global.DOMMatrix === 'undefined') {
    // @ts-ignore
    global.DOMMatrix = DOMMatrix;
  }
} catch (error) {
  // @napi-rs/canvas is optional - if it's not installed, we'll skip the polyfill
  // This is fine for most test environments
  console.warn('@napi-rs/canvas not available, skipping DOMMatrix polyfill:', error);
}

// Polyfill URL.createObjectURL and URL.revokeObjectURL for pdfjs-dist
if (typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = () => 'blob:http://localhost/fake-blob-url';
}
if (typeof global.URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = () => {
    /* no-op */
  };
}
