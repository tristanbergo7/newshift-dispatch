// Starts a Cloudflare quick tunnel to localhost:3000 and writes the public URL
// to .tunnel-url so /qr can pick it up automatically.
import { spawn } from "child_process";
import fs from "fs";

const port = process.env.PORT || 3000;
const child = spawn("npx", ["--yes", "cloudflared", "tunnel", "--url", `http://localhost:${port}`], {
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

let found = false;
function scan(buf) {
  const text = buf.toString();
  if (!found) {
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m) {
      found = true;
      fs.writeFileSync(".tunnel-url", m[0]);
      console.log(`\n  ✅ Public URL: ${m[0]}\n  📱 Phone:  ${m[0]}/upload\n  🔳 QR:     http://localhost:${port}/qr\n`);
    }
  }
}
child.stdout.on("data", scan);
child.stderr.on("data", scan);
child.on("exit", (code) => {
  try { fs.unlinkSync(".tunnel-url"); } catch {}
  console.log("tunnel exited", code);
  process.exit(code ?? 0);
});
process.on("SIGINT", () => child.kill("SIGINT"));
