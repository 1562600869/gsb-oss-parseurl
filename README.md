<!-- GSB Mode A green init from https://github.com/pillarjs/parseurl (MIT). Slim for GSB: dropped benchmark/ and .github/. -->
# parseurl

[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![Node.js Version][node-image]][node-url]
[![Build Status][github-actions-ci-image]][github-actions-ci-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Parse a URL with memoization. / 带 memoization 缓存的 Node.js 请求 URL 解析小库。

## 安装（Install）

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/). Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install parseurl
```

## API

```js
var parseurl = require('parseurl')
```

## 关键解析语义（中文说明）

### `parseurl(req)` 与 `parseurl.original(req)` 的分工

- `parseurl(req)` 读取并解析 `req.url`，结果缓存在 `req._parsedUrl` 上。
- `parseurl.original(req)` 优先解析 `req.originalUrl`（仅当其为字符串时），
  结果缓存在 `req._parsedOriginalUrl` 上；只有当 `req.originalUrl` 不是字符串时，
  才回落到 `parseurl(req)`（即解析 `req.url`）。
- 因此在路由挂载前缀等场景下，`req.url` 的变化绝不会让 `original` 的缓存失效或被改写：
  `original` 始终以 `req.originalUrl` 为准。

### `_raw` 判鲜与 memoization

- 每次解析后会把原始字符串记录到结果对象的 `_raw` 属性上。
- 缓存命中条件是：缓存存在、是 `url.Url` 实例（或等价的普通对象外形）**且**
  `parsed._raw === 当前 url`。不能用 `parsed.href === url` 判鲜——例如
  `'/foo/bar '`（尾部空格）会回落到完整的 `url.parse`，其 `href` 与原始串不同，
  但 `_raw` 仍记录原始串，第二次调用必须命中同一个缓存对象。
- 一旦 `req.url` / `req.originalUrl` 字符串发生变化，`_raw` 对不上就会丢弃旧缓存
  重新解析并写回（旧对象上外挂的 `_token` 等字段也随之消失）。

### 快路径（fast path）的 query/search

- 首字节为 `/` 的字符串走快路径：扫描到第一个 `?` 时，
  `pathname` 为 `?` 之前的部分；`search` 为含前导 `?` 的子串（如 `'?a=b'`）；
  `query` 为去掉前导 `?` 后的子串（如 `'a=b'`）；`href` / `path` 保持原始串。
- 扫描过程中一旦遇到 `#`（hash）或空白/控制字符，则回落到 Node 核心的
  `url.parse` 做完整解析，以正确剥离 `search` / `query` 并处理 hash。

### `//` 开头的伪 auth URL

- 快路径只要求首字节是 `/`，**不**额外排除第二个字节也是 `/` 的情况。
  因此 `'//todo@txt'` 不会被 `url.parse` 当成 `//auth@host` 而得到
  `pathname: null`，而是直接得到 `pathname === '//todo@txt'`。

### `undefined` 入参

- 当 `req.url === undefined` 时，`parseurl(req)` 短路返回 `undefined`，
  不会用 `'/'` 或空串伪造一个根路径对象，以免调用方误判“存在 URL”。
- `parseurl.original(req)` 在 `req.originalUrl` 与 `req.url` 均缺失（皆非字符串）时，
  同样返回 `undefined`。

### 绝对 URL 的 host / hostname / port

- 非 `/` 开头的字符串（如 `'http://localhost:8888/foo/bar'`）交给
  `url.parse` 完整解析，其 `host === 'localhost:8888'`、
  `hostname === 'localhost'`、`port === '8888'`，本库不在事后打乱这些字段。

## 测试（Test）

```sh
$ npm test
```

测试命令为 `mocha --check-leaks --bail --reporter spec test/`。当前仓库实测全绿摘要：

```
  parseurl(req)
    ✔ should parse the request URL
    ✔ should parse with query string
    ✔ should parse with hash
    ✔ should parse with query string and hash
    ✔ should parse a full URL
    ✔ should not choke on auth-looking URL
    ✔ should return undefined missing url
    when using the same request
      ✔ should parse multiple times
      ✔ should reflect url changes
      ✔ should cache parsing
      ✔ should cache parsing where href does not match

  parseurl.original(req)
    ✔ should parse the request original URL
    ✔ should parse originalUrl when different
    ✔ should parse req.url when originalUrl missing
    ✔ should return undefined missing req.url and originalUrl
    when using the same request
      ✔ should parse multiple times
      ✔ should reflect changes
      ✔ should cache parsing
      ✔ should cache parsing if req.url changes
      ✔ should cache parsing where href does not match

  20 passing
```

## License

  [MIT](LICENSE)

[coveralls-image]: https://badgen.net/coveralls/c/github/pillarjs/parseurl/master
[coveralls-url]: https://coveralls.io/r/pillarjs/parseurl?branch=master
[github-actions-ci-image]: https://badgen.net/github/checks/pillarjs/parseurl/master?label=ci
[github-actions-ci-url]: https://github.com/pillarjs/parseurl/actions?query=workflow%3Aci
[node-image]: https://badgen.net/npm/node/parseurl
[node-url]: https://nodejs.org/en/download
[npm-downloads-image]: https://badgen.net/npm/dm/parseurl
[npm-url]: https://npmjs.org/package/parseurl
[npm-version-image]: https://badgen.net/npm/v/parseurl
