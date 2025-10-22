cat > docker-entrypoint.js << 'EOF'
const { spawnSync, spawn } = require("child_process");

function runSync(cmd, args = []) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (res.status !== 0) {
    console.warn(`${cmd} ${args.join(" ")} exited with ${res.status}`);
  }
}

(async () => {
  try {
    console.log("Running prisma generate...");
    runSync("npx", ["prisma", "generate"]);

    console.log("Running prisma migrate deploy...");
    runSync("npx", ["prisma", "migrate", "deploy"]);
  } catch (e) {
    console.error("Error during startup tasks:", e);
  }

  console.log("Starting app...");
  const child = spawn("npm", ["run", "start"], { stdio: "inherit" });

  process.on("SIGINT", () => {
    child.kill("SIGINT");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
    process.exit(0);
  });
})();
EOF
