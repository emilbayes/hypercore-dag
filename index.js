'use strict'
var assert = require('assert')

var parallel = require('run-parallel')
var mutexify = require('mutexify')
var pipeline = require('pumpify')
var stream = require('stream')

var messages = require('./messages')

function noop () {}

module.exports = HypercoreDAG

function HypercoreDAG (feed, opts) {
  if (!(this instanceof HypercoreDAG)) return new HypercoreDAG(feed, opts)
  opts = opts || {}

  assert.ok(feed, 'feed must be passed')

  this._feed = feed
  this._lock = opts.lock || mutexify()

  return this
}

var proto = HypercoreDAG.prototype

proto.get = function get (index, cb) {
  this._feed.get(index, function (err, block) {
    if (err) return cb(err)

    return cb(null, messages.Node.decode(block))
  })
}

proto.add = function add (links, value, cb) {
  var self = this
  links = [].concat(links == null ? [] : links)
  cb = cb || noop

  self._lock(function (release) {
    // Links cannot point forward
    var invalidLinks = links.filter(function (link) {
      return link >= self._feed.blocks || link < 0
    })

    if (invalidLinks.length > 0) {
      var err = new Error('Some links are invalid (either negative or pointing forward)')
      err.invalidLinks = invalidLinks

      return release(cb, err)
    }

    getNewDepth(function (err, depth) {
      if (err) return cb(err)

      self._feed.append(messages.Node.encode({
        depth: depth,
        links: links,
        value: value
      }), release.bind(null, cb, err, self._feed.blocks))
    })
  })

  function getNewDepth (cb) {
    var linkThunks = links.map(function (link) {
      return function (done) {
        self.get(link, done)
      }
    })

    parallel(linkThunks, function (err, nodes) {
      if (err) return cb(err)

      var maxDepth = nodes.reduce(function (max, node) {
        console.log(node)
        return Math.max(max, node.depth)
      }, -1)

      return cb(null, maxDepth + 1)
    })
  }
}

proto.createReadStream = function (opts) {
  return pipeline.obj(this._feed.createReadStream(opts), new stream.Transform({
    objectMode: true,
    transform: function (msg, enc, cb) {
      return cb(null, messages.Node.decode(msg))
    }
  }))
}
