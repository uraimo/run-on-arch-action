const core = require('@actions/core')
const fs = require('fs');
const path = require('path')
const YAML = require('yaml');
const { exec } = require('@actions/exec')

function slug(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '-');
}

async function main() {
  if (process.platform !== 'linux') {
    throw new Error('run-on-arch supports only Linux')
  }

  const arch = core.getInput('arch', { required: true });
  const distro = core.getInput('distro', { required: true });

  // If bad arch/distro passed, fail fast before installing all the qemu stuff
  const dockerFile = path.join(
    __dirname, '..', 'Dockerfiles', `Dockerfile.${arch}.${distro}`);
  if (!fs.existsSync(dockerFile)) {
    throw new Error(`run-on-arch: ${dockerFile} does not exist.`);
  }

  // Write setup commands to a script file for sourcing
  let setup = core.getInput('setup') || '';
  fs.writeFileSync(
    path.join(__dirname, 'run-on-arch-setup.sh'),
    setup,
  );

  // If no shell provided, default to sh for alpine, bash for others
  let shell = core.getInput('shell') || '';
  if (!shell) {
    if (/alpine/.test(distro)) {
      shell = '/bin/sh';
    } else {
      shell = '/bin/bash';
    }
  }

  // Write container commands to a script file for running
  let commands = core.getInput('run', { required: true });
  commands = `#!${shell}\nset -eu\n${commands}`;
  fs.writeFileSync(
    path.join(__dirname, 'run-on-arch-commands.sh'),
    commands,
  );

  // Sanitize dockerRunArgs: replace escaped and unescaped newlines with a space
  let dockerRunArgs = (core.getInput('dockerRunArgs') || '')
    .replace(/\\?[\r\n]+/g, ' ');

  const githubToken = core.getInput('githubToken') || '';

  // Copy environment variables from parent process
  const env = { ...process.env };

  if (githubToken) {
    env.GITHUB_TOKEN = githubToken;
  }

  // Parse YAML and for environment variables.
  // They are imported to the container via passing `-e VARNAME` to
  // docker run.
  const envYAML = core.getInput('env');
  if (envYAML) {
    const mapping = YAML.parse(envYAML)
    if (typeof mapping !== 'object' || mapping instanceof Array) {
      throw new Error(`run-on-arch: env must be a flat mapping of key/value pairs.`);
    }
    Object.entries(mapping).forEach(([key, value]) => {
      if (typeof value === 'object') {
        // Nested YAML is invalid
        throw new Error(`run-on-arch: env ${key} value must be flat.`);
      }
      env[key] = value;
      dockerRunArgs += ` -e ${key} `;
    });
  }

  // Generate a container name slug unique to this arch/distro combo
  const containerName = `run-on-arch-${slug(arch)}-${slug(distro)}`;

  console.log('Configuring Docker for multi-architecture support')
  await exec(
    path.join(__dirname, 'run-on-arch.sh'),
    [ dockerFile, dockerRunArgs, containerName, shell],
    { env },
  );
}

main().catch(err => {
  core.setFailed(err.message)
})
