import core from "@actions/core";
import fs from "fs";
import path from "path";
import shlex from "shlex";
import { exec } from "@actions/exec";

function slug(str: string) {
  return str.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}

const platforms = [
  "linux/amd64",
  "linux/arm64",
  "linux/arm/v6",
  "linux/arm/v7",
  "linux/ppc64le",
  "linux/s390x",
] as const;

type Platform = typeof platforms[number];

const assetsDir = path.join(__dirname, "assets");

async function main() {
  const platform = core.getInput("platform", { required: true }) as Platform;
  if (!platforms.includes(platform))
    throw new Error(`${platform} is not a supported platform yet`);

  const baseImage = core.getInput("image", { required: true });

  // pull docker image first so we know if this just doesn't exist
  await exec(`docker pull --platform ${platform} ${baseImage}`);

  //

  // Write setup commands to a script file for sourcing
  const setup = core.getInput("setup");
  fs.writeFileSync(path.join(assetsDir, "run-on-arch-setup.sh"), setup);

  // If no shell provided, default to sh for alpine, bash for others
  const shell = core.getInput("shell", { required: true });

  // Write install commands to a script file for running in the Dockerfile
  const installScript = [
    `#!/bin/${shell}`,
    "set -eu;",
    "export DEBIAN_FRONTEND=noninteractive;",
    core.getInput("install"),
  ].join("\n");

  fs.writeFileSync(
    path.join(assetsDir, "run-on-arch-install.sh"),
    installScript
  );

  // Write container commands to a script file for running
  const commands = [
    `#!${shell}`,
    "set -eu;",
    core.getInput("run", { required: true }),
  ].join("\n");
  fs.writeFileSync(path.join(assetsDir, "run-on-arch-commands.sh"), commands);

  // Parse dockerRunArgs into an array with shlex
  const dockerRunArgs = shlex.split(core.getInput("dockerRunArgs"));

  const githubToken = core.getInput("githubToken");

  // Generate a container name slug unique to this workflow
  const containerName = slug(
    [
      "run-on-arch",
      process.env.GITHUB_REPOSITORY,
      process.env.GITHUB_WORKFLOW,
      platform,
      baseImage,
    ].join("-")
  );

  console.log("Configuring Docker for multi-architecture support");

  await exec(
    path.join(assetsDir, "run-on-arch.sh"),
    [baseImage, containerName, platform, ...dockerRunArgs],
    {
      env: {
        ...process.env,
        GITHUB_TOKEN: githubToken ?? process.env.GITHUB_TOKEN,
      } as Record<string, string>,
    }
  );
}

main().catch((err) => {
  core.setFailed(err.message);
});
