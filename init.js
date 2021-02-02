#!/usr/bin/env node
/* eslint-disable no-console, consistent-return */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

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
      process.exit(0)
    }
  }
}

const copyFile = (fileName, lastFile = false, showLog = true) => {
  const src = path.join(__dirname, `${HOOKS_FOLDERNAME}/${fileName}`)
  const dest = path.join(process.cwd(), `${GIT_HOOKS_FOLDERNAME}/${fileName}`)

  if (src === dest) return

  fs.copyFile(src, dest, (error) => {
    if (error) {
      console.error(chalk`{bold.red [ERROR]  } could not copy {bold ${fileName}}.`)
    } else if (showLog) {
      console.log(chalk`{bold.magenta [ADDED]  } git hook {bold ${fileName}}`)
    }

    fs.chmodSync(dest, '755')

    if (lastFile) {
      console.log(chalk`{bold.green [SUCCESS]} git hooks were successfully installed!`)
    }
  })
}

const getKeyByValue = (object, value) => {
  return object ? Object.keys(object).find((key) => object[key] === value) : null
}

const installGitHooks = () => {
  const hasGitFolder = fs.existsSync(path.join(process.cwd(), GIT_FOLDERNAME))
  const hasGitHookFolder = fs.existsSync(path.join(process.cwd(), GIT_HOOKS_FOLDERNAME))

  // check if it is a git repository
  if (!hasGitFolder || !hasGitHookFolder) {
    console.error(
      chalk`{bold.red [ERROR]  } could not install git hooks, because this folder is not a github repository.`
    )

    // do not exit the process but stop here
    // otherwise vercel build fails
    return null
  }

  // check if hooks are available
  if (!fs.existsSync(path.join(__dirname, HOOKS_FOLDERNAME))) {
    console.error(chalk`{bold.red [ERROR]  } no git hooks found to install.`)
  }

  // add script `postinstall` to package.json
  const packagePath = path.join(process.cwd(), PACKAGE_FILENAME)
  const packageLocalPath = path.join(__dirname, PACKAGE_FILENAME)

  const pkg = JSON.parse(getPackageContent(packagePath))
  const pkgLocal = JSON.parse(getPackageContent(packageLocalPath))

  if (pkg.scripts.postinstall) {
    console.warn(chalk`{bold.yellow [WARNING]} {bold postinstall} in ${PACKAGE_FILENAME} was overwritten.`)
  } else {
    console.log(chalk`{bold.magenta [ADDED]  } {bold postinstall} in ${PACKAGE_FILENAME}.`)
  }

  pkg.scripts.postinstall = getKeyByValue(pkgLocal.bin, './init.js') || '4th-git-hooks'

  // write to package.json
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, '  '), 'utf-8')

  // hooks to copy from ./hooks/
  const files = fs.readdirSync(path.join(__dirname, HOOKS_FOLDERNAME))

  files.forEach((fileName, index) => {
    const isJavascriptFile = fileName.split('.').pop() === 'js'

    // show log information not for js files
    copyFile(fileName, index === files.length - 1, !isJavascriptFile)
  })
}

module.exports = installGitHooks()
