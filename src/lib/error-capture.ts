// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

// Monkey-patch console.error to catch h3's internal error logs
const originalConsoleError = console.error;
console.error = function (...args) {
  if (args.length > 0) {
    // If it looks like an Error object, record it
    if (args[0] instanceof Error) {
      record(args[0]);
    } else if (typeof args[0] === "string" && args[0].includes("h3")) {
      record(new Error(args.join(" ")));
    } else {
      record(new Error(args.join(" ")));
    }
  }
  originalConsoleError.apply(console, args);
};

// Also catch Node.js uncaught exceptions if we are in Node
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("uncaughtException", (err) => record(err));
  process.on("unhandledRejection", (reason) => record(reason));
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
