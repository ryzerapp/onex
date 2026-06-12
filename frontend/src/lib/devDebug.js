// Dev-only debug helper. Stripped in production builds.
const isDev = typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development";

export const devDebug = (...args) => {
  if (isDev) {
    console.debug(...args);
  }
};
