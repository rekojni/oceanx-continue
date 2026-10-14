import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
const addresses = networkInterfaces()[process.env.OCEANX_WIFI_INTERFACE || "en0"] || [];
const address = addresses.find((a) => a.family === "IPv4" && !a.internal)?.address;
if (!address)
  throw new Error(
    "No Wi-Fi IPv4 address found. Connect to Wi-Fi or set OCEANX_WIFI_INTERFACE to the correct interface.",
  );
console.log(`Private Wi-Fi preview: http://${address}:5174/learn`);
const child = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "dev", "--host", address, "--port", "5174", "--strictPort"],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
