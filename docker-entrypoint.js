#!/usr/bin/env node
// docker-entrypoint.js
const { spawnSync, spawn } = require("child_process");

function runSync(cmd, args = []) {
  // use shell:true para mayor compatibilidad en contenedores
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (res.status !== 0) {
    console.warn(`${cmd} ${args.join(" ")} exited with ${res.status}`);
  }
}

(async () => {
  try {
    console.log("Running prisma generate...");
    runSync("npx", ["prisma", "generate"]);

    console.log("Running prisma migrate deploy...");
    // deploy aplica migraciones en producción
    runSync("npx", ["prisma", "migrate", "deploy"]);
  } catch (e) {
    console.error("Error during startup tasks:", e);
  }

  console.log("Starting app...");
  // Ejecuta el comando start (usa shell:true para resolver npm en PATH)
  const child = spawn("npm", ["run", "start"], { stdio: "inherit", shell: true });

  ["SIGINT", "SIGTERM"].forEach((sig) =>
    process.on(sig, () => {
      child.kill(sig);
      process.exit(0);
    })
  );
})();
