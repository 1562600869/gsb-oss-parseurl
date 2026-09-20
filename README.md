<!-- GSB Mode A green init from https://github.com/pillarjs/parseurl (MIT). Slim for GSB: dropped benchmark/ and .github/. -->
# parseurl

[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![Node.js Version][node-image]][node-url]
[![Build Status][github-actions-ci-image]][github-actions-ci-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Parse a URL with memoization.

## 中文说明（关键解析语义）

本库是 [pillarjs/parseurl](https://github.com/pillarjs/parseurl) 的精简版本，
为 Node.js 请求对象提供带 memoization（缓存）的 URL 解析，无任何运行时依赖。

- **`parseurl(req)` 与 `parseurl.original(req)` 的分工**：`parseurl` 读取并解析
  `req.url`；`parseurl.original` 优先解析 `req.originalUrl`，仅当它不是字符串时
  才回落到 `parseurl(req)`（即 `req.url`）。因此在 express 挂载前缀的场景下，
  `req.url` 被改写为剥掉前缀的路径，也不会影响 original 的解析结果。
- **`_raw` 判鲜（缓存失效）**：解析结果缓存在 `req._parsedUrl` /
  `req._parsedOriginalUrl` 上。缓存是否可复用取决于 `parsed._raw === 当前字符串`，
  而**不是** `parsed.href === url`：同一请求多次调用会复用同一对象；一旦
  `req.url` 或 `req.originalUrl` 改变，旧缓存立即失效并重新解析（外挂字段如
  `_token` 也随之消失）。当 url 带 trailing space（如 `'/foo/bar '`）时
  `url.parse` 产出的 `href` 会剥掉空格、与原始串不等，但仍按 `_raw` 命中缓存。
- **快路径的 query/search 拆分**：以 `/` 开头的简单路径走快路径
  `/pathname?query`：`pathname` 不含 `?` 及其之后的内容；`search` 保留前导 `?`
  （如 `'?a=1'`）；`query` 是去掉前导 `?` 后的串（如 `'a=1'`）；`href` 与 `path`
  保持原始字符串。一旦出现 `#`（hash）或空白字符，则回落到 Node 核心
  `url.parse`，以正确剥离 `search` / `query`。
- **`//` 不会被误当成 auth/host**：快路径只看首字节是否为 `/`，不额外排除第二个
  `/`。因此 `//todo@txt` 会得到 `pathname === '//todo@txt'`，而不会被
  `url.parse` 拆成协议相对 URL（那会得到 `pathname: null`）。
- **`undefined` 入参短路返回 `undefined`**：当 `req.url === undefined`（以及
  `originalUrl` 与 `req.url` 皆缺）时直接返回 `undefined`，绝不会用 `'/'` 或空串
  伪造一个根路径对象，调用方据此可靠判断“是否存在 URL”。
- **绝对 URL**：不以 `/` 开头的字符串（如 `http://localhost:8888/foo/bar`）交给
  `url.parse`，`host === 'localhost:8888'`、`hostname === 'localhost'`、
  `port === '8888'` 等字段保持核心解析结果，不做事后改写。

### 测试

```bash
$ npm test
```

当前真实输出摘要（`mocha --check-leaks --bail --reporter spec test/`）：

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

## Install

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

### parseurl(req)

Parse the URL of the given request object (looks at the `req.url` property)
and return the result. The result is the same as `url.parse` in Node.js core.
Calling this function multiple times on the same `req` where `req.url` does
not change will return a cached parsed object, rather than parsing again.

### parseurl.original(req)

Parse the original URL of the given request object and return the result.
This works by trying to parse `req.originalUrl` if it is a string, otherwise
parses `req.url`. The result is the same as `url.parse` in Node.js core.
Calling this function multiple times on the same `req` where `req.originalUrl`
does not change will return a cached parsed object, rather than parsing again.

## Benchmark

```bash
$ npm run-script bench

> parseurl@1.3.3 bench nodejs-parseurl
> node benchmark/index.js

  http_parser@2.8.0
  node@10.6.0
  v8@6.7.288.46-node.13
  uv@1.21.0
  zlib@1.2.11
  ares@1.14.0
  modules@64
  nghttp2@1.32.0
  napi@3
  openssl@1.1.0h
  icu@61.1
  unicode@10.0
  cldr@33.0
  tz@2018c

> node benchmark/fullurl.js

  Parsing URL "http://localhost:8888/foo/bar?user=tj&pet=fluffy"

  4 tests completed.

  fasturl            x 2,207,842 ops/sec ±3.76% (184 runs sampled)
  nativeurl - legacy x   507,180 ops/sec ±0.82% (191 runs sampled)
  nativeurl - whatwg x   290,044 ops/sec ±1.96% (189 runs sampled)
  parseurl           x   488,907 ops/sec ±2.13% (192 runs sampled)

> node benchmark/pathquery.js

  Parsing URL "/foo/bar?user=tj&pet=fluffy"

  4 tests completed.

  fasturl            x 3,812,564 ops/sec ±3.15% (188 runs sampled)
  nativeurl - legacy x 2,651,631 ops/sec ±1.68% (189 runs sampled)
  nativeurl - whatwg x   161,837 ops/sec ±2.26% (189 runs sampled)
  parseurl           x 4,166,338 ops/sec ±2.23% (184 runs sampled)

> node benchmark/samerequest.js

  Parsing URL "/foo/bar?user=tj&pet=fluffy" on same request object

  4 tests completed.

  fasturl            x  3,821,651 ops/sec ±2.42% (185 runs sampled)
  nativeurl - legacy x  2,651,162 ops/sec ±1.90% (187 runs sampled)
  nativeurl - whatwg x    175,166 ops/sec ±1.44% (188 runs sampled)
  parseurl           x 14,912,606 ops/sec ±3.59% (183 runs sampled)

> node benchmark/simplepath.js

  Parsing URL "/foo/bar"

  4 tests completed.

  fasturl            x 12,421,765 ops/sec ±2.04% (191 runs sampled)
  nativeurl - legacy x  7,546,036 ops/sec ±1.41% (188 runs sampled)
  nativeurl - whatwg x    198,843 ops/sec ±1.83% (189 runs sampled)
  parseurl           x 24,244,006 ops/sec ±0.51% (194 runs sampled)

> node benchmark/slash.js

  Parsing URL "/"

  4 tests completed.

  fasturl            x 17,159,456 ops/sec ±3.25% (188 runs sampled)
  nativeurl - legacy x 11,635,097 ops/sec ±3.79% (184 runs sampled)
  nativeurl - whatwg x    240,693 ops/sec ±0.83% (189 runs sampled)
  parseurl           x 42,279,067 ops/sec ±0.55% (190 runs sampled)
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
