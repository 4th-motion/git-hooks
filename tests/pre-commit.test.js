#!/usr/bin/env node
/* eslint-disable no-console */

const assert = require('assert')
const childProcess = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const repositoryRoot = path.join(__dirname, '..')
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), '4th-git-hooks-'))
const hooksDirectory = path.join(fixtureRoot, '.git', 'hooks')
const binDirectory = path.join(fixtureRoot, 'bin')

const mkdir = (directory) => {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory)
}

const writeExecutable = (filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8')
  fs.chmodSync(filePath, '755')
}

const writeConfig = (taskName) => {
  fs.writeFileSync(
    path.join(fixtureRoot, 'package.json'),
    JSON.stringify({
      scripts: {},
      git: { 'pre-commit': taskName }
    }),
    'utf8'
  )
}

const runHook = (taskName) => {
  writeConfig(taskName)

  return childProcess.spawnSync(path.join(hooksDirectory, 'pre-commit'), {
    cwd: fixtureRoot,
    env: Object.assign({}, process.env, {
      PATH: `${binDirectory}:${process.env.PATH}`,
      HOOK_TEST_CHILD_SCRIPT: path.join(fixtureRoot, 'child-script.sh')
    }),
    encoding: 'utf8'
  })
}

const runGitCommit = (taskName) => {
  writeConfig(taskName)

  return childProcess.spawnSync(
    'git',
    ['-c', 'user.name=Hook Test', '-c', 'user.email=hook@example.com', 'commit', '--allow-empty', '-m', 'test: hook'],
    {
      cwd: fixtureRoot,
      env: Object.assign({}, process.env, {
        PATH: `${binDirectory}:${process.env.PATH}`,
        HOOK_TEST_CHILD_SCRIPT: path.join(fixtureRoot, 'child-script.sh')
      }),
      encoding: 'utf8'
    }
  )
}

const test = (name, callback) => {
  try {
    callback()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

mkdir(binDirectory)

const gitInit = childProcess.spawnSync('git', ['init', '--quiet'], { cwd: fixtureRoot })
assert.strictEqual(gitInit.status, 0)

fs.copyFileSync(path.join(repositoryRoot, 'hooks', 'pre-commit'), path.join(hooksDirectory, 'pre-commit'))
fs.copyFileSync(path.join(repositoryRoot, 'hooks', 'detectHook.js'), path.join(hooksDirectory, 'detectHook.js'))
fs.chmodSync(path.join(hooksDirectory, 'pre-commit'), '755')

writeExecutable(
  path.join(binDirectory, 'yarn'),
  `#!/bin/bash
case "$2" in
  success)
    echo "SUCCESS stdout"
    exit 0
    ;;
  failure)
    echo "FAILURE stdout"
    echo "FAILURE stderr" >&2
    exit 42
    ;;
  missing)
    cat >&2 <<'YARN_ERROR'
Usage Error: Couldn't find a script named "missing".
YARN_ERROR
    exit 1
    ;;
  child-failure)
    "$HOOK_TEST_CHILD_SCRIPT"
    exit $?
    ;;
esac

echo "Unexpected Yarn arguments: $*" >&2
exit 64
`
)

writeExecutable(
  path.join(fixtureRoot, 'child-script.sh'),
  `#!/bin/bash
echo "CHILD stderr" >&2
exit 23
`
)

try {
  test('successful task exits successfully', () => {
    const result = runHook('success')
    assert.strictEqual(result.status, 0)
  })

  test('successful task keeps its output visible', () => {
    const result = runHook('success')
    assert.ok(/SUCCESS stdout/.test(result.stdout))
  })

  test('failed task keeps stdout and stderr visible', () => {
    const result = runHook('failure')
    assert.ok(/FAILURE stdout/.test(result.stdout))
    assert.ok(/FAILURE stderr/.test(result.stderr))
  })

  test('failed task preserves its exit code', () => {
    const result = runHook('failure')
    assert.strictEqual(result.status, 42)
  })

  test('missing Yarn script reports the Yarn error', () => {
    const result = runHook('missing')
    assert.strictEqual(result.status, 1)
    assert.ok(/Couldn't find a script named "missing"/.test(result.stderr))
  })

  test('failure from a child shell script is preserved', () => {
    const result = runHook('child-failure')
    assert.strictEqual(result.status, 23)
    assert.ok(/CHILD stderr/.test(result.stderr))
  })

  test('configured task arrays run in order and stop on failure', () => {
    const result = runHook(['success', 'failure'])
    assert.strictEqual(result.status, 42)
    assert.ok(result.stdout.indexOf('SUCCESS stdout') < result.stdout.indexOf('FAILURE stdout'))
  })

  test('Git exposes the concrete failure to desktop clients', () => {
    const result = runGitCommit('failure')
    assert.notStrictEqual(result.status, 0)
    assert.ok(/FAILURE stderr/.test(result.stderr))
    assert.ok(/Task "failure" failed with exit code 42/.test(result.stderr))
  })
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
}
