// 设置全局变量
global.__DEV__ = process.env.NODE_ENV.trim() === 'development'
global.__PROD__ = process.env.NODE_ENV.trim() === 'production'

// Provide custom regenerator runtime and core-js
require('babel-polyfill')
// Node babel source map support
require('source-map-support').install()
// Javascript require hook
const babelRegister = require('@babel/register')

babelRegister({
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: [
    'add-module-exports',
    '@babel/plugin-transform-runtime',
    [
      'import',
      {
        libraryName: 'antd',
        style: true
      }
    ],
    [
      'css-modules-transform',
      {
        generateScopedName: '[name]__[local]___[hash:base64:5]',
        rootDir: __dirname,
        extensions: ['.css']
      }
    ]
  ]
})

const cssModulesHook = require('css-modules-require-hook')
const lessParser = require('postcss-less').parse

// Css require hook
cssModulesHook({
  extensions: ['.less'],
  rootDir: __dirname,
  processorOpts: { parser: lessParser },
  camelCase: true,
  generateScopedName: '[name]__[local]___[hash:base64:5]'
})

// Image require hook
require('asset-require-hook')({
  name: '/img/[name]-[hash:6].[ext]',
  extensions: ['jpg', 'jpeg', 'png', 'svg'],
  limit: 10240
})

const app = require('./app.js')
const convert = require('koa-convert')
const webpack = require('webpack')
const fs = require('fs')
const path = require('path')
const devMiddleware = require('koa-webpack-dev-middleware')
const hotMiddleware = require('koa-webpack-hot-middleware')
const views = require('koa-views')
const clientRoute = require('./middlewares/clientRoute')
const handle404 = require('./middlewares/handle404')
const webpackConfig = require('../build/webpack.dev.conf')

// 配置别名
const moduleAlias = require('module-alias')

moduleAlias.addAliases(webpackConfig.resolve.alias)

const port = process.env.port || 3725
const compiler = webpack(webpackConfig)

// Webpack hook event to write html file into `/views/dev` from `/views/tpl` due to server render
compiler.plugin('emit', (compilation, callback) => {
  const assets = compilation.assets
  let file
  let data

  Object.keys(assets).forEach(key => {
    if (key.match(/\.html$/)) {
      file = path.resolve(__dirname, key)
      data = assets[key].source()
      fs.writeFileSync(file, data)
    }
  })
  callback()
})

app.use(views(path.resolve(__dirname, '../views/dev'), { map: { html: 'ejs' }}))
app.use(clientRoute.routes())

console.log(`\n==> 🌎  Listening on port ${port}. Open up http://localhost:${port}/ in your browser.\n`)

app.use(
  convert(
    devMiddleware(compiler, {
      noInfo: true,
      publicPath: webpackConfig.output.publicPath
    })
  )
)
app.use(convert(hotMiddleware(compiler)))

app.use(handle404) // 处理404

module.exports = app.listen(port)
