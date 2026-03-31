/**
 * Utilities for verifying Cross-Origin Isolation is active.
 *
 * mGBA-WASM uses SharedArrayBuffer for its internal Emscripten pthreads.
 * SharedArrayBuffer is only available when the page is cross-origin isolated,
 * meaning the server must send both:
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 */

/**
 * Returns true when the current browsing context is cross-origin isolated.
 * Safe to call in any environment — returns false if `self` is unavailable
 * or if the property is missing (e.g. old browsers, non-secure contexts).
 */
export function isCrossOriginIsolated(): boolean {
  return typeof self !== 'undefined' && self.crossOriginIsolated === true;
}

/**
 * Asserts that the current context is cross-origin isolated.
 * Throws a descriptive Error when the requirement is not met so that callers
 * surface a clear message to the developer rather than a cryptic WASM crash.
 *
 * @throws {Error} When `crossOriginIsolated` is false or unavailable.
 */
export function assertCrossOriginIsolated(): void {
  if (!isCrossOriginIsolated()) {
    throw new Error(
      'Cross-origin isolation is not enabled. ' +
        'The server must set Cross-Origin-Opener-Policy: same-origin and ' +
        'Cross-Origin-Embedder-Policy: require-corp headers. ' +
        'The mGBA emulator requires SharedArrayBuffer support for its internal threads.',
    );
  }
}
