/**
 * SDK version — read from package.json at load time so the User-Agent
 * header never drifts from the published version.
 *
 * @internal
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

function readVersion(): string {
  try {
    // The compiled output lives in `dist/` alongside its sibling files;
    // package.json is one directory up from the compiled module.
    // `__dirname` is available under CommonJS output (NodeNext without
    // `"type": "module"` in package.json, which is our current setup).
    const pkgPath = join(__dirname, "..", "package.json");
    const raw = readFileSync(pkgPath, "utf-8");
    const { version } = JSON.parse(raw) as { version?: string };
    if (typeof version === "string" && version.length > 0) return version;
  } catch {
    // Fall through — never break the SDK over a missing manifest
    // (e.g. bundled into another project without the package.json).
  }
  return "unknown";
}

export const SDK_VERSION: string = readVersion();
