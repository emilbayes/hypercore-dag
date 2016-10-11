# `hypercore-dag`

> DAGs on top of hypercore, allowing verified random-access to graph nodes

## Usage

```js
'use strict'

var assert = require('assert')

var hypercore = require('hypercore')
var memdb = require('memdb')
var hypercoreDag = require('.')

var core = hypercore(memdb())
var dag = hypercoreDag(core.createFeed())

// We're building the following graph (Time on x axis, depth on y axis)
// 0     2
// \- 1  \
//    \--\-- 3

dag.add(null, 'Root', function (err, ref0) {
  assert.ifError(err)

  dag.add(ref0, 'Child 1', function (err, ref1) {
    assert.ifError(err)

    dag.add(null, 'Another root', function (err, ref2) {
      assert.ifError(err)

      dag.add([ref0, ref1, ref2], 'Tie them', function (err, ref3) {
        assert.ifError(err)

        dag.get(ref3, function (err, node) {
          assert.ifError(err)

          assert.deepEqual(node.links, [0, 1, 2])
          assert.equal(node.depth, 2)
          assert.equal(node.value, 'Tie them')
        })
      })
    })
  })
})

```

## API

### `hypercoreDag(feed, [opts])`

`opts` being `{lock: mutexify()}`

### `dag.add(links, value, [callback])`

### `dag.get(index, callback)`

### `dag.createReadStream([opts])`

## Extras

### `require('hypercore-dag/bfs-stream')(startIndex, [opts])`

Preform a [Breadth-first search](https://en.wikipedia.org/wiki/Breadth-first_search)
from `startIndex`

### `require('hypercore-dag/dfs-stream')(startIndex, [opts])`

Preform a [Depth-first search](https://en.wikipedia.org/wiki/Depth-first_search)
from `startIndex`

## Install

```sh
npm install hypercore-dag
```

## License

[ISC](LICENSE.md)
