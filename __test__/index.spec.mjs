import test from 'ava'
import { watch } from '../index.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Helper function to create a temporary test file
async function createTempFile(content = '') {
  const tempFile = path.join(__dirname, 'temp-test.js')
  await fs.writeFile(tempFile, content)
  return tempFile
}

// Helper function to cleanup temporary files
async function cleanup(file) {
  try {
    await fs.unlink(file)
  } catch (err) {
    // Ignore errors if file doesn't exist
  }
}

// Store active watch processes for cleanup
const activeProcesses = new Set()

// Helper function to cleanup watch processes
function cleanupProcesses() {
  for (const process of activeProcesses) {
    try {
      process.kill()
    } catch (err) {
      // Ignore errors if process is already terminated
    }
  }
  activeProcesses.clear()
}

// Helper function to check if a command exists
function commandExists(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

test.before(async t => {
  // Setup: Create test files and directories if needed
  t.context.tempFile = await createTempFile('console.log("test")')
})

test.after(async t => {
  // Cleanup: Remove test files and directories
  await cleanup(t.context.tempFile)
  cleanupProcesses()
})

test.afterEach(() => {
  // Cleanup processes after each test
  cleanupProcesses()
})

test('watch function exists', t => {
  t.is(typeof watch, 'function')
})

test('watch accepts valid options', async t => {
  const options = {
    script: t.context.tempFile,
    ext: 'js,mjs',
    ignore: ['node_modules'],
    exec: 'node',
    delay: 1.0
  }

  await t.notThrowsAsync(async () => {
    // Create a promise that resolves after a short delay
    const watchPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve()
      }, 100)

      try {
        const proc = watch(options)
        if (proc && typeof proc === 'object' && proc.kill) {
          activeProcesses.add(proc)
        }
      } catch (err) {
        clearTimeout(timeout)
        throw err
      }
    })

    return watchPromise
  })
})

test('watch accepts minimal options', async t => {
  const options = {
    script: t.context.tempFile
  }

  await t.notThrowsAsync(async () => {
    const watchPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve()
      }, 100)

      try {
        const proc = watch(options)
        if (proc && typeof proc === 'object' && proc.kill) {
          activeProcesses.add(proc)
        }
      } catch (err) {
        clearTimeout(timeout)
        throw err
      }
    })

    return watchPromise
  })
})

test('watch accepts custom extensions', async t => {
  const options = {
    script: t.context.tempFile,
    ext: 'ts,jsx,mjs'
  }

  await t.notThrowsAsync(async () => {
    const watchPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve()
      }, 100)

      try {
        const proc = watch(options)
        if (proc && typeof proc === 'object' && proc.kill) {
          activeProcesses.add(proc)
        }
      } catch (err) {
        clearTimeout(timeout)
        throw err
      }
    })

    return watchPromise
  })
})

test('watch accepts custom delay', async t => {
  const options = {
    script: t.context.tempFile,
    delay: 2.5
  }

  await t.notThrowsAsync(async () => {
    const watchPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve()
      }, 100)

      try {
        const proc = watch(options)
        if (proc && typeof proc === 'object' && proc.kill) {
          activeProcesses.add(proc)
        }
      } catch (err) {
        clearTimeout(timeout)
        throw err
      }
    })

    return watchPromise
  })
})

test('watch accepts custom exec command', async t => {
  // Skip test if node is not available (which would be very unusual)
  if (!commandExists('node')) {
    t.pass('Skipping test because node is not available')
    return
  }

  const options = {
    script: t.context.tempFile,
    exec: 'node'  // Using node instead of ts-node as it's guaranteed to be available
  }

  await t.notThrowsAsync(async () => {
    const watchPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve()
      }, 100)

      try {
        const proc = watch(options)
        if (proc && typeof proc === 'object' && proc.kill) {
          activeProcesses.add(proc)
        }
      } catch (err) {
        clearTimeout(timeout)
        throw err
      }
    })

    return watchPromise
  })
})
