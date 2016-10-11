'use strict'
var test = require('tape')

var after = require('after-all')
var memdb = require('memdb')
var hypercore = require('hypercore')
var hypercoreDag = require('..')

test('add should fail on negative links', function (assert) {
  var next = after(function () {
    assert.end()
  })

  var dag = hypercoreDag(hypercore(memdb()).createFeed())

  dag.add([-1], 'I am failing', next(function (err, index) {
    assert.ok(err)
    assert.deepEqual(err.invalidLinks, [-1])

    assert.notOk(index)
  }))

  dag.add(null, 'I am groot', next())
  dag.add([-1, 0, -2], 'I am failing too', next(function (err, index) {
    assert.ok(err)
    assert.deepEqual(err.invalidLinks, [-1, -2])

    assert.notOk(index)
  }))
})

test('add should fail on forward links', function (assert) {
  var next = after(function () {
    assert.end()
  })

  var dag = hypercoreDag(hypercore(memdb()).createFeed())

  dag.add(null, 'I am groot', next())
  dag.add([0, 1], 'I am child', next(function (err, index) {
    assert.ok(err)
    assert.deepEqual(err.invalidLinks, [1])

    assert.notOk(index)
  }))
})

test('add should return monotonically increasing numbers', function (assert) {
  var indicies = []
  var next = after(function (err) {
    assert.error(err)
    assert.deepEqual(indicies, indicies.slice().sort())
    assert.end()
  })

  function push (err, n) {
    assert.error(err)
    indicies.push(n)
  }

  var dag = hypercoreDag(hypercore(memdb()).createFeed())

  dag.add(null, 'I am groot', next(push))
  dag.add(null, 'I too am groot', next(push))
  dag.add([0, 1], 'I am their child', next(push))
  dag.add([0, 1], 'I am their child too', next(push))
  dag.add([2], 'something', next(push))
})

test('add should not require callback', function (assert) {
  var dag = hypercoreDag(hypercore(memdb()).createFeed())

  dag.add(null, 'I am groot')
  process.nextTick(function () {
    dag.add(null, 'I too am groot', function (err, ref) {
      assert.error(err)
      assert.equal(ref, 1)
      assert.end()
    })
  })
})
