var https = require('https')
var ndjson = require('ndjson')
var pump = require('pump')
var querystring = require('querystring').stringify
var through = require('through2')
var to = require('flush-write-stream')

var TOKEN = process.env.PINBOARD_TOKEN

pump(
  process.stdin,
  ndjson.parse(),
  through.obj(function (chunk, _, done) {
    var self = this
    chunk.bookmarks.forEach(function (bookmark) {
      self.push(bookmark)
    })
    done()
  }),
  to.obj(function (bookmark, _, done) {
    var title = bookmark.article.title || bookmark.article.url
    var data = {
      auth_token: TOKEN,
      url: bookmark.article.url,
      description: title,
      dt: (bookmark.date_added.replace(' ', 'T') + 'Z'),
      shared: 'no',
      toread: bookmark.archive ? 'no' : 'yes'
    }
    var request = {
      host: 'api.pinboard.in',
      path: '/v1/posts/add?' + querystring(data)
    }
    https.request(request)
    .once('response', function (response) {
      var buffer = []
      response
      .on('data', function (chunk) {
        buffer.push(chunk)
      })
      .once('error', function (error) {
        done(error)
      })
      .once('end', function () {
        var body = Buffer.concat(buffer).toString()
        if (body.indexOf('code="done"') !== -1) {
          console.log('Wrote "' + title + '"')
          done()
        } else {
          console.error(title)
          console.error(body)
          done(body)
        }
      })
    })
    .end()
  })
)
