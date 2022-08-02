const fs = require('fs')
const util = require('util')
const join = require('path').join
const mkdirp = require('mkdirp')
const sina = require('./sina')
// const readFile = util.promisify(fs.readFile)
// const writeFile = util.promisify(fs.writeFile)
const copyFile = util.promisify(fs.copyFile)

module.exports = async function fetch(dir, uid, cookie) {
  // 生成目录
  mkdirp.sync(dir)
  mkdirp.sync(dir + '/imgs')
  mkdirp.sync(dir + '/blog')

  // 复制依赖的模版
  await copyFile(join(__dirname, '../tpl/vue.js'), join(dir, 'vue.js'))
  await copyFile(join(__dirname, '../tpl/style.css'), join(dir, 'style.css'))
  await copyFile(join(__dirname, '../tpl/index.html'), join(dir, 'index.html'))

  await sina(uid, dir, cookie) // 备份博文

  // await writeFile(join(dir, 'data.js'), 'window.blog=' + JSON.stringify(data), 'utf8') // 写入数据文件data.js

  // const tmpl = await readFile(join(__dirname, '../tpl/template.html'), 'utf8') // 读取模版
  // const render = new Function('d', 'return `' + tmpl + '`') // 生成渲染函数
  // await writeFile(join(dir, 'index.html'), render({title: data.title}), 'utf8') // 生成并写入index.html
}
