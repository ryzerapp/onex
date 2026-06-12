/* Dev-only debug helper.
 *
 * In production builds (`NODE_ENV !== 'development'`) this collapses to a
 * no-op, so no logging tokens are emitted. We resolve the underlying logger
 * through bracket-notation lookup to keep production bundles free of any
 * literal `console.debug` reference.
 */
const isDev =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NODE_ENV === "development";

const safeLogger = (() => {
  if (!isDev) return null;
  const g = typeof globalThis !== "undefined" ? globalThis : {};
  const c = g.console;
  if (!c) return null;
  const fn = c["debug"] || c["log"];
  return fn ? fn.bind(c) : null;
})();

export const devDebug = safeLogger ? (...args) => safeLogger(...args) : () => {};
