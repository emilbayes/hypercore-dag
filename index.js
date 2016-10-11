'use strict'
var assert = require('assert')

var parallel = require('run-parallel')
var mutexify = require('mutexify')
var pipeline = require('pumpify')
var stream = require('stream')
var codec = require('./codec')

var messages = require('./messages')

function noop () {}

module.exports = HypercoreDAG

function HypercoreDAG (feed, opts) {
  if (!(this instanceof HypercoreDAG)) return new HypercoreDAG(feed, opts)
  opts = opts || {}

  assert.ok(feed != null, 'feed must be passed')

  this.feed = feed
  this.lock = opts.lock || mutexify()
  this.valueEncoding = opts.valueEncoding || opts.encoding || 'binary'

  return this
}

var proto = HypercoreDAG.prototype

proto.get = function get (index, cb) {
  assert.ok(index < self.feed.blocks, 'index out of range')
  assert.equal(typeof cb, 'function', 'callback must be function')

  var self = this
  this.feed.get(index, function (err, block) {
    if (err) return cb(err)

    var node = messages.Node.decode(block)
    node.value = codec.decode(node.value, self.valueEncoding)

    return cb(null, node)
  })
}

proto.add = function add (links, value, cb) {
  var self = this
  links = [].concat(links == null ? [] : links)
  cb = cb || noop

  assert.ok(Array.isArray(links), 'links must result in array')
  assert.ok(links.every(function (link) { return Number.isSafeInteger(link) }), 'links must be safe integers')
  assert.ok(value, 'value must be present')
  assert.ok(cb == null ? true : typeof cb === 'function', 'callback should be function')

  self.lock(function (release) {
    // Links cannot point forward
    var invalidLinks = links.filter(function (link) {
      return link >= self.feed.blocks || link < 0
    })

    if (invalidLinks.length > 0) {
      var err = new Error('Some links are invalid (either negative or pointing forward)')
      err.invalidLinks = invalidLinks

      return release(cb, err)
    }

    getNewDepth(function (err, depth) {
      if (err) return cb(err)

      self.feed.append(messages.Node.encode({
        depth: depth,
        links: links,
        value: codec.encode(value, self.valueEncoding)
      }), release.bind(null, cb, err, self.feed.blocks))
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
        return Math.max(max, node.depth)
      }, -1)

      return cb(null, maxDepth + 1)
    })
  }
}

proto.createReadStream = function (opts) {
  var self = this
  return pipeline.obj(this.feed.createReadStream(opts), new stream.Transform({
    objectMode: true,
    transform: function (msg, enc, cb) {
      var node = messages.Node.decode(msg)
      node.value = codec.decode(node.value, opts.valueEncoding || self.valueEncoding)
      return cb(null, node)
    }
  }))
}
