const core = require('@actions/core')
const fs = require('fs');
const path = require('path')
const YAML = require('yaml');
const shlex = require('shlex');
const { exec } = require('@actions/exec')

function slug(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

function dockerArch(qemuArch) {
  const matrix = {
    'i386':    '386',
    'x86_64':  'amd64',
    'armv5':   'arm/v5',
    'armv6':   'arm/v6',
    'armv7':   'arm/v7',
    'aarch64': 'arm64',
  };
  
  return matrix[qemuArch] || qemuArch;
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
  let setup = core.getInput('setup');
  fs.writeFileSync(
    path.join(__dirname, 'run-on-arch-setup.sh'),
    setup,
  );

  // If no shell provided, default to sh for alpine, bash for others
  let shell = core.getInput('shell');
  if (!shell) {
    if (/alpine/.test(distro)) {
      shell = '/bin/sh';
    } else {
      shell = '/bin/bash';
    }
  }
  let installShell;
  if (/alpine/.test(distro)) {
    // Alpine has busybox and must use /bin/sh at least for installation.
    installShell = '/bin/sh';
  } else {
    installShell = shell;
  }

  // Write install commands to a script file for running in the Dockerfile
  const install = [
    `#!${installShell}`, 'set -eu;', 'export DEBIAN_FRONTEND=noninteractive;',
    core.getInput('install'),
  ].join('\n');
  fs.writeFileSync(
    // Must be in same directory as Dockerfiles
    path.join(__dirname, '..', 'Dockerfiles', 'run-on-arch-install.sh'),
    install,
  );

  // Write container commands to a script file for running
  const commands = [
    `#!${shell}`, 'set -eu;', core.getInput('run', { required: true }),
  ].join('\n');
  fs.writeFileSync(
    path.join(__dirname, 'run-on-arch-commands.sh'),
    commands,
  );

  // Parse dockerRunArgs into an array with shlex
  const dockerRunArgs = shlex.split(core.getInput('dockerRunArgs'));

  const githubToken = core.getInput('githubToken');

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
      dockerRunArgs.push(`-e${key}`);
    });
  }

  // Generate a container name slug unique to this workflow
  const containerName = slug([
    'run-on-arch', env.GITHUB_REPOSITORY, env.GITHUB_WORKFLOW,
    arch, distro,
  ].join('-'));

  console.log('Configuring Docker for multi-architecture support')
  await exec(
    path.join(__dirname, 'run-on-arch.sh'),
    [ dockerArch(arch), dockerFile, containerName, ...dockerRunArgs ],
    { env },
  );
}

main().catch(err => {
  core.setFailed(err.message)
})
