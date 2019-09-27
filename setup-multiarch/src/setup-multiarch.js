const core = require('@actions/core')
const {exec} = require('@actions/exec')

async function main() {
  if (process.platform === 'linux') {
    console.log('Configuring Docker for multi-architecture support')
    await exec('./setup-multiarch.sh')
  } else {
    throw new Error('setup-multiarch supports only Linux')
  }
}

main().catch(err => {
  core.setFailed(err.message)
})
