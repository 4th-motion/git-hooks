#!/usr/bin/env node
/* eslint-disable global-require, no-console */
const fs = require('fs')
const path = require('path')

const packagePath = path.join(__dirname, '../../package.json')
const hook = process.argv[2]

if (fs.existsSync(packagePath) && fs.statSync(packagePath).isFile()) {
  const pkg = require(packagePath)
  const hooks = []

  if (pkg && typeof pkg.git === 'object') {
    if (typeof pkg.git[hook] === 'string') {
      hooks.push(pkg.git[hook])
    } else if (Array.isArray(pkg.git[hook])) {
      hooks.push(...pkg.git[hook])
    }
  }

  if (hooks.length > 0) {
    console.log(hooks.join(' '))
  }
}
