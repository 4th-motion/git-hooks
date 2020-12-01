#!/usr/bin/env node
/* eslint-disable no-console, consistent-return */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

// scripts and hooks to copy from ./hooks/
const scripts = ['detectHook.js']
const hooks = ['pre-commit']

const PACKAGE_FILENAME = 'package.json'
const HOOKS_FOLDERNAME = 'hooks'
const GIT_FOLDERNAME = '.git'
const GIT_HOOKS_FOLDERNAME = '.git/hooks'

// get package.json content
const getPackageContent = (packagePath) => {
  try {
    return fs.readFileSync(packagePath, 'utf-8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(chalk`{bold.red [ERROR]  } no package.json was found in {underline ${packagePath}}.`)
      process.exit(1)
    }
  }
}

const copyFile = (fileName, lastFile = false) => {
  const src = path.join(__dirname, `${HOOKS_FOLDERNAME}/${fileName}`)
  const dest = path.join(process.cwd(), `${GIT_HOOKS_FOLDERNAME}/${fileName}`)

  if (src === dest) return

  fs.copyFile(src, dest, (error) => {
    if (error) {
      console.error(chalk`{bold.red [ERROR]  } could not copy {bold ${fileName}}.`)
    } else {
      console.log(chalk`{bold.magenta [ADDED]  } git hook {bold ${fileName}}`)
    }

    fs.chmodSync(dest, '755')

    if (lastFile) {
      console.log(chalk`{bold.green [SUCCESS]} git hooks were successfully installed!`)
    }
  })
}

const installGitHooks = () => {
  const hasGitFolder = fs.existsSync(path.join(process.cwd(), GIT_FOLDERNAME))
  const hasGitHookFolder = fs.existsSync(path.join(process.cwd(), GIT_HOOKS_FOLDERNAME))

  // check if it is a git repository
  if (!hasGitFolder || !hasGitHookFolder) {
    console.error(
      chalk`{bold.red [ERROR]  } could not install git hooks, because this folder is not a github repository.`
    )
    process.exit(1)
  }

  // check if hooks are available
  if (!fs.existsSync(path.join(__dirname, HOOKS_FOLDERNAME))) {
    console.error(chalk`{bold.red [ERROR]  } no git hooks found to install.`)
    process.exit(1)
  }

  // add script `postinstall` to package.json
  const packagePath = path.join(process.cwd(), PACKAGE_FILENAME)
  const pkg = JSON.parse(getPackageContent(packagePath))

  if (pkg.scripts.postinstall) {
    console.warn(chalk`{bold.yellow [WARNING]} {bold postinstall} in ${PACKAGE_FILENAME} was overwritten.`)
  } else {
    console.log(chalk`{bold.magenta [ADDED]  } {bold postinstall} in ${PACKAGE_FILENAME}.`)
  }

  pkg.scripts.postinstall = '4th-git-hooks'

  // write to package.json
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, '  '), 'utf-8')

  // install git hooks
  scripts.concat(hooks).forEach((hook, index) => {
    copyFile(hook, index === hooks.length - 1)
  })
}

module.exports = installGitHooks()
