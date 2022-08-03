#!/usr/bin/env node

const join = require('path').join
const yargs = require('yargs')
const fetch = require('./lib/fetch')
const package = require('./package.json')

process.on('exit', (code) => {
  console.log(`exit with code: ${code}`)
})

process.on('SIGHUP', (code) => {
  console.log(`SIGHUP exit with code: ${code}`)
})

process.on('SIGINT', (code) => {
  console.log(`SIGINT exit with code: ${code}`)
})

process.on('SIGTERM', (code) => {
  console.log(`SIGTERM exit with code: ${code}`)
})

process.on('uncaughtException', (err) => {
  console.log(`uncaught exception: ${err}`)
})

process.on('unhandledRejection', (err) => {
  console.log(`uncaught rejection: ${err}`)
})

let argv = yargs
  .option('u', {
    alias : 'uid',
    demand: false,
    requiresArg: true,
    describe: '博客uid',
    type: 'string'
  })
  .option('c', {
    alias : 'cookie',
    demand: false,
    requiresArg: false,
    describe: '登录后的cookie',
    type: 'string'
  })
  .usage('Usage: dature [options]')
  .help('h')
  .alias('h', 'help')
  .example('dature -u 1263917762')
  .epilog('@junyiz')
  .argv;

if (argv.uid) {
  console.log(`dature@${package.version}\n`)

  const dir = join(process.cwd(), `./blog-${argv.uid}`)
  const cookie = (argv.cookie || '')
    .replace(/(NowDate|BLOG_TITLE|mblog_userinfo)[^;]*;/g, '')

  console.info(`\n博客存储目录：${dir}\n`)

  fetch(dir, argv.uid, cookie).then(() => {
    console.info(`\n备份完毕\n`)
  })
} else {
  yargs.showHelp()
}

/*
 新浪博客UID, 例 1263917762
*/
