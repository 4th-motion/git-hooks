#!/usr/bin/env node
/* eslint-disable no-console */

const assert = require('assert')
const childProcess = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const repositoryRoot = path.join(__dirname, '..')
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), '4th-git-hooks-commit-msg-'))
const hookPath = path.join(fixtureRoot, '.git', 'hooks', 'commit-msg')
const messagePath = path.join(fixtureRoot, 'COMMIT_EDITMSG')

const run = (command, args) =>
  childProcess.spawnSync(command, args, {
    cwd: fixtureRoot,
    encoding: 'utf8'
  })

const runHook = (message) => {
  fs.writeFileSync(messagePath, message, 'utf8')
  return run(hookPath, [messagePath])
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

const gitInit = run('git', ['init', '--quiet', '--initial-branch=feature/test'])
assert.strictEqual(gitInit.status, 0)

fs.copyFileSync(path.join(repositoryRoot, 'hooks', 'commit-msg'), hookPath)
fs.chmodSync(hookPath, '755')

try {
  const validMessages = [
    'fix: preserve task output',
    'fix(backend): preserve task output',
    'feat(api-client)!: remove legacy endpoint',
    'refactor(content_api): simplify parser',
    'CU-123abc: preserve task output',
    'docs(readme): document scopes\n\nAdditional context.'
  ]

  validMessages.forEach((message) => {
    test(`accepts ${JSON.stringify(message.split('\n')[0])}`, () => {
      const result = runHook(message)
      assert.strictEqual(result.status, 0, result.stderr || result.stdout)
    })
  })

  const invalidMessages = [
    'fix (backend): preserve task output',
    'fix(): preserve task output',
    'fix(Backend): preserve task output',
    'fix(backend):',
    'feature(backend): preserve task output',
    'CU-123(backend): preserve task output',
    'CU-123: ',
    'prefix fix(backend): preserve task output'
  ]

  invalidMessages.forEach((message) => {
    test(`rejects ${JSON.stringify(message)}`, () => {
      const result = runHook(message)
      assert.strictEqual(result.status, 1)
      assert.ok(/commit message format is invalid/i.test(result.stderr))
    })
  })

  test('accepts a scoped message passed by Git', () => {
    const result = run('git', [
      '-c',
      'user.name=Hook Test',
      '-c',
      'user.email=hook@example.com',
      'commit',
      '--allow-empty',
      '-m',
      'fix(backend): preserve task output'
    ])
    assert.strictEqual(result.status, 0, result.stderr || result.stdout)
  })

  test('returns a format error through Git', () => {
    const result = run('git', [
      '-c',
      'user.name=Hook Test',
      '-c',
      'user.email=hook@example.com',
      'commit',
      '--allow-empty',
      '-m',
      'fix (backend): preserve task output'
    ])
    assert.strictEqual(result.status, 1)
    assert.ok(/commit message format is invalid/i.test(result.stderr))
  })

  test('accepts the merge commit created by Git', () => {
    const gitCommit = (message) =>
      run('git', [
        '-c',
        'user.name=Hook Test',
        '-c',
        'user.email=hook@example.com',
        'commit',
        '--allow-empty',
        '-m',
        message
      ])

    assert.strictEqual(run('git', ['checkout', '--quiet', '-b', 'feature/merge']).status, 0)
    assert.strictEqual(gitCommit('feat: add merge source').status, 0)
    assert.strictEqual(run('git', ['checkout', '--quiet', 'feature/test']).status, 0)
    assert.strictEqual(gitCommit('fix: diverge from merge source').status, 0)

    const result = run('git', [
      '-c',
      'user.name=Hook Test',
      '-c',
      'user.email=hook@example.com',
      'merge',
      '--no-ff',
      '--no-edit',
      'feature/merge'
    ])
    assert.strictEqual(result.status, 0, result.stderr || result.stdout)
  })

  test('rejects a merge message outside of a merge', () => {
    const result = runHook("Merge branch 'feature/merge'")
    assert.strictEqual(result.status, 1)
    assert.ok(/commit message format is invalid/i.test(result.stderr))
  })

  test('rejects commits directly to master', () => {
    const renameResult = run('git', ['branch', '-m', 'master'])
    assert.strictEqual(renameResult.status, 0)

    const result = runHook('fix(backend): preserve task output')
    assert.strictEqual(result.status, 1)
    assert.ok(/directly to master/.test(result.stderr))
  })
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
}
