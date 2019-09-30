const core = require('@actions/core')
const path = require('path')
const {exec} = require('@actions/exec')

async function main() {
  if (process.platform === 'linux') {

    const arch = core.getInput('architecture', {required: true})
    const distro = core.getInput('distribution', {required: true})
    const runs = core.getInput('run', {required: true})

    console.log('Configuring Docker for multi-architecture support')
    await exec(path.join(__dirname, 'run-on-arch.sh'),[arch,distro,runs])
  } else {
    throw new Error('run-on-arch supports only Linux')
  }
}

main().catch(err => {
  core.setFailed(err.message)
})
