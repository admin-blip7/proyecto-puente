import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

const projectRoot = process.cwd();
const source = path.join(projectRoot, "iphone-diagnostic-service", "bridge-agent.mjs");
const distDir = path.join(projectRoot, "iphone-diagnostic-service", "dist");

fs.mkdirSync(distDir, { recursive: true });

const builds = [
  { target: "node18-macos-arm64", output: "bridge-agent-macos-arm64" },
  { target: "node18-win-x64", output: "bridge-agent-win-x64.exe" },
  { target: "node18-linux-x64", output: "bridge-agent-linux-x64" },
];

for (const build of builds) {
  console.log(`Building ${build.target}...`);
  execFileSync("npx", [
    "--yes",
    "pkg",
    source,
    "--targets",
    build.target,
    "--output",
    path.join(distDir, build.output),
  ], { stdio: "inherit" });
}

if (os.platform() === "darwin") {
  const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), "diag-bridge-"));
  const appDir = path.join(srcDir, "DiagnosticoBridgeAgent.app", "Contents");
  const macosDir = path.join(appDir, "MacOS");
  const dmgPath = path.join(distDir, "DiagnosticoBridgeAgent.dmg");

  fs.mkdirSync(macosDir, { recursive: true });
  fs.writeFileSync(
    path.join(appDir, "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>DiagnosticoBridgeAgent</string>
  <key>CFBundleIdentifier</key><string>com.22electronic.bridgeagent</string>
  <key>CFBundleName</key><string>DiagnosticoBridgeAgent</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
</dict>
</plist>`
  );

  fs.copyFileSync(
    path.join(distDir, "bridge-agent-macos-arm64"),
    path.join(macosDir, "DiagnosticoBridgeAgent")
  );
  fs.chmodSync(path.join(macosDir, "DiagnosticoBridgeAgent"), 0o755);

  // Sign the app bundle itself so macOS treats it as a coherent bundle
  // instead of a loose executable dropped into Contents/MacOS.
  execFileSync(
    "codesign",
    ["--force", "--deep", "--sign", "-", path.join(srcDir, "DiagnosticoBridgeAgent.app")],
    { stdio: "inherit" }
  );

  execSync(
    `hdiutil create -volname "DiagnosticoBridgeAgent" -srcfolder "${srcDir}" -ov -format UDZO -o "${dmgPath}"`,
    { stdio: "inherit" }
  );
}

console.log("Bridge agent binaries ready in iphone-diagnostic-service/dist");
