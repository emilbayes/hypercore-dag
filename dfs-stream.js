'use strict'
var bitfield = require('bitfield')
var from = require('from2')

module.exports = function (dag, start) {
  var queue = [start]
  var visited = bitfield(dag.feed.blocks - 1)

  return from.obj(function (_, next) {
    var idx = queue.pop()
    if (idx != null) {
      visited.set(idx, true)
      dag.get(idx, function (err, node) {
        if (err) return next(err)

        node.links.forEach(function (idx) {
          if (visited.get(idx) === false) {
            queue.push(idx)
          }
        })

        return next(null, node)
      })
    } else {
      next(null, null)
    }
  })
}
