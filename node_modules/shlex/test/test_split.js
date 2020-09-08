/* eslint-env mocha */
'use strict'

const { assert } = require('chai')
const shlex = require('../shlex')

describe('shlex.split()', function () {
  // The original test data set was from shellwords, by Hartmut Goebel

  const posixTestcases = [
    ['x', 'x'],
    ['foo bar', 'foo', 'bar'],
    [' foo bar', 'foo', 'bar'],
    [' foo bar ', 'foo', 'bar'],
    ['foo   bar    bla     fasel', 'foo', 'bar', 'bla', 'fasel'],
    ['x y  z              xxxx', 'x', 'y', 'z', 'xxxx'],
    ['\\x bar', 'x', 'bar'],
    ['\\ x bar', ' x', 'bar'],
    ['\\ bar', ' bar'],
    ['foo \\x bar', 'foo', 'x', 'bar'],
    ['foo \\ x bar', 'foo', ' x', 'bar'],
    ['foo \\ bar', 'foo', ' bar'],
    ['foo "bar" bla', 'foo', 'bar', 'bla'],
    ['"foo" "bar" "bla"', 'foo', 'bar', 'bla'],
    ['"foo" bar "bla"', 'foo', 'bar', 'bla'],
    ['"foo" bar bla', 'foo', 'bar', 'bla'],
    ["foo 'bar' bla", 'foo', 'bar', 'bla'],
    ["'foo' 'bar' 'bla'", 'foo', 'bar', 'bla'],
    ["'foo' bar 'bla'", 'foo', 'bar', 'bla'],
    ["'foo' bar bla", 'foo', 'bar', 'bla'],
    ['blurb foo"bar"bar"fasel" baz', 'blurb', 'foobarbarfasel', 'baz'],
    ["blurb foo'bar'bar'fasel' baz", 'blurb', 'foobarbarfasel', 'baz'],
    ['""', ''],
    ["''", ''],
    ['foo "" bar', 'foo', '', 'bar'],
    ["foo '' bar", 'foo', '', 'bar'],
    ['foo "" "" "" bar', 'foo', '', '', '', 'bar'],
    ["foo '' '' '' bar", 'foo', '', '', '', 'bar'],
    ['\\"', '"'],
    ['"\\""', '"'],
    ['"foo\\ bar"', 'foo\\ bar'],
    ['"foo\\\\ bar"', 'foo\\ bar'],
    ['"foo\\\\ bar\\""', 'foo\\ bar"'],
    ['"foo\\\\" bar\\"', 'foo\\', 'bar"'],
    ['"foo\\\\ bar\\" dfadf"', 'foo\\ bar" dfadf'],
    ['"foo\\\\\\ bar\\" dfadf"', 'foo\\\\ bar" dfadf'],
    ['"foo\\\\\\x bar\\" dfadf"', 'foo\\\\x bar" dfadf'],
    ['"foo\\x bar\\" dfadf"', 'foo\\x bar" dfadf'],
    ["\\'", "'"],
    ["'foo\\ bar'", 'foo\\ bar'],
    ["'foo\\\\ bar'", 'foo\\\\ bar'],
    ["\"foo\\\\\\x bar\\\" df'a\\ 'df\"", "foo\\\\x bar\" df'a\\ 'df"],
    ['\\"foo', '"foo'],
    ['\\"foo\\x', '"foox'],
    ['"foo\\x"', 'foo\\x'],
    ['"foo\\ "', 'foo\\ '],
    ['foo\\ xx', 'foo xx'],
    ['foo\\ x\\x', 'foo xx'],
    ['foo\\ x\\x\\"', 'foo xx"'],
    ['"foo\\ x\\x"', 'foo\\ x\\x'],
    ['"foo\\ x\\x\\\\"', 'foo\\ x\\x\\'],
    ['"foo\\ x\\x\\\\""foobar"', 'foo\\ x\\x\\foobar'],
    ["\"foo\\ x\\x\\\\\"\\'\"foobar\"", "foo\\ x\\x\\'foobar"],
    ["\"foo\\ x\\x\\\\\"\\'\"fo'obar\"", "foo\\ x\\x\\'fo'obar"],
    ["\"foo\\ x\\x\\\\\"\\'\"fo'obar\" 'don'\\''t'", "foo\\ x\\x\\'fo'obar", "don't"],
    ["\"foo\\ x\\x\\\\\"\\'\"fo'obar\" 'don'\\''t' \\\\", "foo\\ x\\x\\'fo'obar", "don't", '\\'],
    ["'foo\\ bar'", 'foo\\ bar'],
    ["'foo\\\\ bar'", 'foo\\\\ bar'],
    ['foo\\ bar', 'foo bar'],
    // ["foo#bar\nbaz", "foo", "baz"], // FIXME: Comments are not implemented
    [':-) ;-)', ':-)', ';-)'],
    ['\u00e1\u00e9\u00ed\u00f3\u00fa', '\u00e1\u00e9\u00ed\u00f3\u00fa'],
    ['hello \\\n world', 'hello', 'world']
  ]

  const ansiCTestcases = [
    ['$\'x\'', 'x'], // non-escaped character
    ['$\'\\a\'', '\x07'], // alert (bell)
    ['$\'\\b\'', '\x08'], // backspace
    ['$\'\\e\'', '\x1b'], // escape character
    ['$\'\\E\'', '\x1b'], // escape character
    ['$\'\\f\'', '\x0c'], // form feed / new page
    ['$\'\\n\'', '\x0a'], // newline
    ['$\'\\r\'', '\x0d'], // carriage return
    ['$\'\\t\'', '\x09'], // horizontal tab
    ['$\'\\v\'', '\x0b'], // vertical tab
    ['$\'\\\\\'', '\\'], // backslash
    ['$\'\\\'\'', '\''], // single quote
    ['$\'\\"\'', '"'], // double quote
    ['$\'\\?\'', '?'], // question mark
    ['$\'\\79\'', '\x07\x39'], // octal + non-octal
    ['$\'\\07\'', '\x07'], // octal, zero prefix
    ['$\'\\xfx\'', '\x0f\x78'], // hex (one digit) + non-hex
    ['$\'\\xffx\'', '\xff\x78'], // hex (two digits) + non-hex
    ['$\'\\xxx\'', '\\xxx'], // invalid hex
    ['$\'\\u2603\'', '☃'], // unicode character
    ['$\'\\U2603\'', '☃'], // unicode character
    ['$\'\\ca\'', '\x01'], // control-a character
    ['$\'\\cA\'', '\x01'], // control-A character, same as above
    ['$\'\\c@\'', '\x00'], // control-@ character: null
    ['$\'\\c?\'', '\x7f'], // control-? character: del
    ['$\'\\\\x30\'', '\\x30'],
    ['x$\'y\'z', 'xyz'],
    ['"x"$\'y\'"z"', 'xyz'],
    ['$\'x\'"y"$\'z\'', 'xyz'],
    ['x"$\'y\'"z', 'x$\'y\'z']
  ]

  const localeTestcases = [
    ['$"x"', 'x'], // non-escaped character
    ['$"\\""', '"'], // escaped quotation mark
    ['$"\\\\"', '\\'], // escaped escape character
    ['$"\\x33"', '\\x33'], // other escape sequences do not work
    ['x$"y"z', 'xyz'],
    ['"x"$"y""z"', 'xyz'],
    ['$"x""y"$"z"', 'xyz'],
    ['x"$"y""z', 'x$yz']
  ]

  it('should split according to POSIX rules', function () {
    posixTestcases.forEach(function (test) {
      const input = test[0]
      const expected = test.slice(1)

      assert.deepEqual(shlex.split(input), expected)
    })
  })

  it('should split ANSI C strings', function () {
    ansiCTestcases.forEach(function (test) {
      const input = test[0]
      const expected = test.slice(1)

      assert.deepEqual(shlex.split(input), expected)
    })
  })

  it('should split localized strings', function () {
    localeTestcases.forEach(function (test) {
      const input = test[0]
      const expected = test.slice(1)

      assert.deepEqual(shlex.split(input), expected)
    })
  })
})
