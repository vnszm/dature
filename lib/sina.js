const fs = require('fs')
const path = require('path')
const util = require('util')
const cheerio = require('cheerio')
const isUrl = require('is-url')
const writeFile = util.promisify(fs.writeFile)
const uuid = require('./uuid')
const htmlDownloader = require('./html-downloader')
const pictureDownloader = require('./picture-downloader')

function image(dir, name, url, referer) {
  const dest = path.join(dir, 'imgs', name)
  if (!fs.existsSync(dest)) {
    pictureDownloader({ url, dest, referer })
  }
}

function parse(filename, prefix) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8').replace(prefix, ''))
  } catch(e) {
    return null
  }
}

function stringify(json, prefix) {
  return prefix + JSON.stringify(json)
}

async function articleList(uid, dir, cookie) {
  let title, link, urls = []
  const prefix = 'window.blog='
  const filename = path.join(dir, 'data.js')

  if (fs.existsSync(filename)) {
    const { urls } = parse(filename, prefix)
    return urls
  }

  console.log('博客文章目录:\n')

  // 遍历博文目录，抽取博客标题、博文地址
  let i = 1, page = 1
  do {
    const list = await htmlDownloader(`http://blog.sina.com.cn/s/articlelist_${uid}_0_${i}.html`, { cookie }).catch(console.error)
    const $ = cheerio.load(list)
    console.log(`第 ${i} 页：`)
    $('.articleList .atc_main a[title]').each((i, el) => {
      const elem = $(el)
      const href = elem.attr('href')
      const text = elem.text()
      if (isUrl(href)) {
        urls.push({ text, href })
        console.log(`    ${text}`)
      }
    })
    if (i === 1) {
      page = ($('span[style]').text().match(/\d+/) || [0])[0] // 总页数
      title = $('title').text().split('_')[1]  // 博客标题
      link = $('.bloglink a').attr('href')    // 博客链接
    }
  } while (++i <= page)

  console.log('\n备份私密博文目录:\n')
  i = 1, page = 1
  do {
    const list = await htmlDownloader(`http://control.blog.sina.com.cn/blog_rebuild/blog/controllers/articlelist.php?uid=${uid}&p=${i}&status=5`, { cookie }).catch(console.error)
    const $ = cheerio.load(list)
    console.log(`第 ${i} 页：`)
    $('.articleList .atc_main a[title]').each((i, el) => {
      const elem = $(el)
      const href = elem.attr('href')
      const text = elem.text()
      if (isUrl(href)) {
        urls.push({ text, href })
        console.log(`    ${text}`)
      }
    })
    if (i === 1) {
      page = ($('span[style]').text().match(/\d+/) || [0])[0] // 总页数
    }
  } while (++i <= page)

  await writeFile(filename, stringify({ uid, title, link, urls }, prefix ), 'utf8') // 写入数据文件data.js
  
  console.log(`\n博客:${title || ''}, 共有文章 ${urls.length} 篇, 以下开始按篇备份:\n`)

  return urls
}

async function article(link, dir, cookie) {
  const prefix = 'window.post='
  const filename = path.join(dir, path.basename(link, '.html').replace('_', '/') + '.js')
  if (fs.existsSync(filename)) {
    const obj = parse(filename, prefix)
    if (obj) {
      const { imgs, link } = obj
      for (let k in imgs) {
        image(dir, k, imgs[k], link)
      }
      return undefined
    }
  }

  let post = await htmlDownloader(link, { cookie }).catch(console.error)
  let $ = cheerio.load(post, {decodeEntities: false})
  let title = $('.titName').text()       // 博文标题
  let date = $('.time.SG_txtc').text().replace(/(\(|\))/g, '')   // 博文发布时间
  let cate = $('.blog_class a').text()      // 博文分类
  let tags = []
  let imgs = {}
  let content = ''

  // 有2种博文页面，根据title判断
  if (title) {
    content = $('div.articalContent').html()
  } else {
    title = $('.h1_tit').text()
    content = $('div.BNE_cont').html()
  }

  // 抽取博客的标签
  $('.blog_tag h3 a').each(function() {
    tags.push($(this).text())
  })

  if (content) {
    content = content
      .replace(/<(p|span|td)[^>]*/gi, '<$1')        // 去掉p、span、td等标签的属性
      .replace(/\n?<\/?(span|wbr|br)[^>]*>\n?/gi, '')   // 去掉span、wbr、br等无用标签
      .replace(/<a[^>]*><\/a>/gi, '') // 去掉空的a标签
      // 下载正文中的图片，并替换为本地图片地址
      .replace(/<img[^>]*real_src="([^"]*)"([^>]*)>/gi, (m, url, b) => {
        url = url.replace(/&amp;/gi, '&'); // 图片地址
        if (/mw690/.test(url) && /\&690$/.test(url)) {
          url = url.replace('mw690', 'orignal').replace('&690', '') // 替换为原始大图
        }
        let name = uuid().replace(/-/g, '').toUpperCase() // 图片名称
        // 只下载地址以http开头的图片
        if (url.indexOf('http') == 0 && isUrl(url)) {
          imgs[name] = url
          image(dir, name, url, link)
          return `<img src="./imgs/${name}" />`
        } else {
          return ''
        }
      })
      .replace(/<a[^>]*>(<img[^>]*>)<\/a>/gi, '$1') // 去掉图片的a链接
      .trim()
  } else {
    content = '很抱歉,该文章已经被加密!'
  }

  await writeFile(filename, stringify({ title, date, cate, tags, imgs, link, content }, prefix), 'utf8')
}

module.exports = async function extract(uid, dir, cookie) {
  const urls = await articleList(uid, dir, cookie)

  let n = 1
  // 遍历博文地址，抽取博文内容（标题、正文、时间、分类、图片、原文链接）
  for (let url of urls) {
    console.log(`博文(${n++}/${urls.length})：${url.text}`)
    await article(url.href, dir, cookie)
  }
}
