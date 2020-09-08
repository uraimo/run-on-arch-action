/* eslint-env mocha */
'use strict'

const { assert } = require('chai')
const shlex = require('../shlex')

describe('shlex.quote()', function () {
  const safeUnquoted = 'abcdefghijklmnopqrstuvwxyz' +
                       'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                       '0123456789' +
                       '@%_-+=:,./'
  const unicodeSample = '\xe9\xe0\xdf' // e + acute accent, a + grave, sharp s
  const unsafe = '"`$\\!' + unicodeSample

  it('should escape the empty string', function () {
    assert.equal(shlex.quote(''), '\'\'')
  })

  it('should not escape safe strings', function () {
    assert.equal(shlex.quote(safeUnquoted), safeUnquoted)
  })

  it('should escape strings containing spaces', function () {
    assert.equal(shlex.quote('test file name'), "'test file name'")
  })

  it('should escape unsafe characters', function () {
    for (var char of unsafe) {
      const input = 'test' + char + 'file'
      const expected = '\'' + input + '\''

      assert.equal(shlex.quote(input), expected)
    }
  })

  it('should escape single quotes', function () {
    assert.equal(shlex.quote('test\'file'), '\'test\'"\'"\'file\'')
  })
})
