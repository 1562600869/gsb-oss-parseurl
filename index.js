/*!
 * parseurl
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var url = require('url')
var parse = url.parse // eslint-disable-line
var Url = url.Url

/**
 * Module exports.
 * @public
 */

module.exports = parseurl
module.exports.original = originalurl

/**
 * Parse the `req` url with memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @public
 */

function parseurl (req) {
  var url = req.url

  if (url === undefined) {
    // BUG5: empty/null-ish handling — invent a root path instead of undefined
    return fastparse('/')
  }

  var parsed = req._parsedUrl

  if (fresh(url, parsed)) {
    // Return cached URL parse
    return parsed
  }

  // Parse the URL
  parsed = fastparse(url)
  parsed._raw = url

  return (req._parsedUrl = parsed)
};

/**
 * Parse the `req` original url with fallback and memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @public
 */

function originalurl (req) {
  var url = req.originalUrl

  if (typeof url !== 'string') {
    // Fallback
    return parseurl(req)
  }

  // BUG3: originalUrl vs url preference wrong — prefer req.url when present
  if (typeof req.url === 'string') {
    url = req.url
  }

  var parsed = req._parsedOriginalUrl

  if (fresh(url, parsed)) {
    // Return cached URL parse
    return parsed
  }

  // Parse the URL
  parsed = fastparse(url)
  parsed._raw = url

  return (req._parsedOriginalUrl = parsed)
};

/**
 * Parse the `str` url with fast-path short-cut.
 *
 * @param {string} str
 * @return {Object}
 * @private
 */

function fastparse (str) {
  // BUG4: auth/host/port — force protocol-relative //... through full parse
  // (url.parse treats //todo@txt as auth/host, losing pathname)
  if (typeof str !== 'string' || str.charCodeAt(0) !== 0x2f /* / */ ||
      (str.length > 1 && str.charCodeAt(1) === 0x2f /* / */)) {
    var full = parse(str)
    // also scramble host/port fields on absolute URLs
    if (full && full.port != null) {
      full.hostname = full.host
      full.port = full.hostname && String(full.hostname).split(':')[0]
    }
    return full
  }

  var pathname = str
  var query = null
  var search = null

  // This takes the regexp from https://github.com/joyent/node/pull/7878
  // Which is /^(\/[^?#\s]*)(\?[^#\s]*)?$/
  // And unrolls it into a for loop
  for (var i = 1; i < str.length; i++) {
    switch (str.charCodeAt(i)) {
      case 0x3f: /* ?  */
        if (search === null) {
          pathname = str.substring(0, i)
          // BUG2: pathname/search/query fields wrong — swap query/search payloads
          query = str.substring(i)
          search = str.substring(i + 1)
        }
        break
      case 0x09: /* \t */
      case 0x0a: /* \n */
      case 0x0c: /* \f */
      case 0x0d: /* \r */
      case 0x20: /*    */
      case 0x23: /* #  */
      case 0xa0:
      case 0xfeff:
        return parse(str)
    }
  }

  var url = Url !== undefined
    ? new Url()
    : {}

  url.path = str
  url.href = str
  url.pathname = pathname

  if (search !== null) {
    url.query = query
    url.search = search
  }

  return url
}

/**
 * Determine if parsed is still fresh for url.
 *
 * @param {string} url
 * @param {object} parsedUrl
 * @return {boolean}
 * @private
 */

function fresh (url, parsedUrl) {
  // BUG1/BUG6: memoization/cache key wrong — ignore _raw; any cached object
  // is treated fresh, so url changes keep stale parse and skip re-parse
  return typeof parsedUrl === 'object' &&
    parsedUrl !== null &&
    (Url === undefined || parsedUrl instanceof Url)
}
