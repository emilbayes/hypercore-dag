'use strict'
var test = require('tape')

var memdb = require('memdb')
var hypercore = require('hypercore')
var hypercoreDag = require('..')
var mutexify = require('mutexify')

test('constructor - simple', function (assert) {
  var dag = hypercoreDag(hypercore(memdb()).createFeed())

  assert.ok(dag instanceof hypercoreDag, 'should return new instance')
  assert.end()
})

test('constructor - external lock', function (assert) {
  assert.plan(7)

  var externalLock = mutexify()
  var core = hypercore(memdb())

  var dag1 = hypercoreDag(core.createFeed(), { lock: externalLock })
  var dag2 = hypercoreDag(core.createFeed())

  assert.notEqual(dag1, dag2, 'distrinct dags')

  var lockedExternally = false
  var releasedExternally = false
  externalLock(function (release) {
    lockedExternally = true

    dag2.add(null, 'Hello', function (err) {
      assert.error(err)

      assert.equal(lockedExternally, false, 'should be unaffected')
      assert.equal(releasedExternally, false, 'should be unaffected')

      release(function () {
        releasedExternally = true
        lockedExternally = false
      })
    })

    dag1.add(null, 'Hello', function (err) {
      assert.error(err)

      assert.equal(lockedExternally, false, 'should not be locked')
      assert.equal(releasedExternally, true, 'should be released')
    })
  })
})

test('constructor - throws', function (assert) {
  assert.throws(_ => hypercoreDag())
  assert.end()
})
