function warn(message) {
  console.warn(`[docker] ${message}`);
}

if (process.env.SKIP_DOCKER_CHECK === "1") {
  process.exit(0);
}

import("node:child_process")
  .then(({ spawnSync }) => {
    const result = spawnSync("docker", ["info"], { stdio: "ignore" });

    if (result.status === 0) {
      return;
    }

    if (result.error?.code === "ENOENT") {
      warn("Docker CLI not found. Install Docker Desktop if you need the database.");
      return;
    }

    warn("Docker isn't running. Start Docker Desktop before using the database.");
  })
  .catch(() => {
    warn("Docker CLI not found. Install Docker Desktop if you need the database.");
  });
