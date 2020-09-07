'use strict'

/*
  Port of a subset of the features of CPython's shlex module, which provides a
  shell-like lexer. Original code by Eric S. Raymond and other contributors.
*/

class Shlexer {
  constructor (string) {
    this.i = 0
    this.string = string

    /**
     * Characters that will be considered whitespace and skipped. Whitespace
     * bounds tokens. By default, includes space, tab, linefeed and carriage
     * return.
     */
    this.whitespace = ' \t\r\n'

    /**
     * Characters that will be considered string quotes. The token accumulates
     * until the same quote is encountered again (thus, different quote types
     * protect each other as in the shell.) By default, includes ASCII single
     * and double quotes.
     */
    this.quotes = `'"`

    /**
     * Characters that will be considered as escape. Just `\` by default.
     */
    this.escapes = '\\'

    /**
     * The subset of quote types that allow escaped characters. Just `"` by default.
     */
    this.escapedQuotes = '"'

    /**
     * Whether to support ANSI C-style $'' quotes
     * https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
     */
    this.ansiCQuotes = true

    /**
     * Whether to support localized $"" quotes
     * https://www.gnu.org/software/bash/manual/html_node/Locale-Translation.html
     *
     * The behavior is as if the current locale is set to C or POSIX, i.e., the
     * contents are not translated.
     */
    this.localeQuotes = true

    this.debug = false
  }

  readChar () {
    return this.string.charAt(this.i++)
  }

  processEscapes (string, quote, isAnsiCQuote) {
    if (!isAnsiCQuote && !this.escapedQuotes.includes(quote)) {
      // This quote type doesn't support escape sequences
      return string
    }

    // We need to form a regex that matches any of the escape characters,
    // without interpreting any of the characters as a regex special character.
    let anyEscape = '[' + this.escapes.replace(/(.)/g, '\\$1') + ']'

    // In regular quoted strings, we can only escape an escape character, and
    // the quote character itself.
    if (!isAnsiCQuote && this.escapedQuotes.includes(quote)) {
      let re = new RegExp(
        anyEscape + '(' + anyEscape + '|\\' + quote + ')', 'g')
      return string.replace(re, '$1')
    }

    // ANSI C quoted strings support a wide variety of escape sequences
    if (isAnsiCQuote) {
      let patterns = {
        // Literal characters
        '([\\\\\'"?])': (x) => x,

        // Non-printable ASCII characters
        'a': () => '\x07',
        'b': () => '\x08',
        'e|E': () => '\x1b',
        'f': () => '\x0c',
        'n': () => '\x0a',
        'r': () => '\x0d',
        't': () => '\x09',
        'v': () => '\x0b',

        // Octal bytes
        '([0-7]{1,3})': (x) => String.fromCharCode(parseInt(x, 8)),

        // Hexadecimal bytes
        'x([0-9a-fA-F]{1,2})': (x) => String.fromCharCode(parseInt(x, 16)),

        // Unicode code units
        'u([0-9a-fA-F]{1,4})': (x) => String.fromCharCode(parseInt(x, 16)),
        'U([0-9a-fA-F]{1,8})': (x) => String.fromCharCode(parseInt(x, 16)),

        // Control characters
        // https://en.wikipedia.org/wiki/Control_character#How_control_characters_map_to_keyboards
        'c(.)': (x) => {
          if (x === '?') {
            return '\x7f'
          } else if (x === '@') {
            return '\x00'
          } else {
            return String.fromCharCode(x.charCodeAt(0) & 31)
          }
        }
      }

      // Construct an uber-RegEx that catches all of the above pattern
      let re = new RegExp(
        anyEscape + '(' + Object.keys(patterns).join('|') + ')', 'g')

      // For each match, figure out which subpattern matched, and apply the
      // corresponding function
      return string.replace(re, function (m, p1) {
        for (let matched in patterns) {
          let mm = new RegExp('^' + matched + '$').exec(p1)
          if (mm === null) {
            continue
          }

          return patterns[matched].apply(null, mm.slice(1))
        }
      })
    }

    // Should not get here
    return undefined
  }

  * [Symbol.iterator] () {
    let inQuote = false
    let inDollarQuote = false
    let escaped = false
    let lastDollar = -2 // position of last dollar sign we saw
    let token

    if (this.debug) {
      console.log('full input:', '>' + this.string + '<')
    }

    while (true) {
      const pos = this.i
      const char = this.readChar()

      if (this.debug) {
        console.log(
          'position:', pos,
          'input:', '>' + char + '<',
          'accumulated:', token,
          'inQuote:', inQuote,
          'inDollarQuote:', inDollarQuote,
          'lastDollar:', lastDollar,
          'escaped:', escaped
        )
      }

      // Ran out of characters, we're done
      if (char === '') {
        if (inQuote) { throw new Error('Got EOF while in a quoted string') }
        if (escaped) { throw new Error('Got EOF while in an escape sequence') }
        if (token !== undefined) { yield token }
        return
      }

      // We were in an escape sequence, complete it
      if (escaped) {
        if (char === '\n') {
          // An escaped newline just means to continue the command on the next
          // line. We just need to ignore it.
        } else if (inQuote) {
          // If we are in a quote, just accumulate the whole escape sequence,
          // as we will interpret escape sequences later.
          token = (token || '') + escaped + char
        } else {
          // Just use the literal character
          token = (token || '') + char
        }

        escaped = false
        continue
      }

      if (this.escapes.includes(char)) {
        if (!inQuote || inDollarQuote !== false || this.escapedQuotes.includes(inQuote)) {
          // We encountered an escape character, which is going to affect how
          // we treat the next character.
          escaped = char
          continue
        } else {
          // This string type doesn't use escape characters. Ignore for now.
        }
      }

      // We were in a string
      if (inQuote !== false) {
        // String is finished. Don't grab the quote character.
        if (char === inQuote) {
          token = this.processEscapes(token, inQuote, inDollarQuote === '\'')
          inQuote = false
          inDollarQuote = false
          continue
        }

        // String isn't finished yet, accumulate the character
        token = (token || '') + char
        continue
      }

      // This is the start of a new string, don't accumulate the quotation mark
      if (this.quotes.includes(char)) {
        inQuote = char
        if (lastDollar === pos - 1) {
          if (char === '\'' && !this.ansiCQuotes) {
            // Feature not enabled
          } else if (char === '"' && !this.localeQuotes) {
            // Feature not enabled
          } else {
            inDollarQuote = char
          }
        }

        token = (token || '') // fixes blank string

        if (inDollarQuote !== false) {
          // Drop the opening $ we captured before
          token = token.slice(0, -1)
        }

        continue
      }

      // This is a dollar sign, record that we saw it in case it's the start of
      // an ANSI C or localized string
      if (inQuote === false && char === '$') {
        lastDollar = pos
      }

      // This is whitespace, so yield the token if we have one
      if (this.whitespace.includes(char)) {
        if (token !== undefined) { yield token }
        token = undefined
        continue
      }

      // Otherwise, accumulate the character
      token = (token || '') + char
    }
  }
}


/**
 * Splits a given string using shell-like syntax.
 *
 * @param {String} s String to split.
 * @returns {String[]}
 */
exports.split = function (s) {
  return Array.from(new Shlexer(s))
}

/**
 * Escapes a potentially shell-unsafe string using quotes.
 *
 * @param {String} s String to quote
 * @returns {String}
 */
exports.quote = function (s) {
  if (s === '') { return '\'\'' }

  var unsafeRe = /[^\w@%\-+=:,./]/
  if (!unsafeRe.test(s)) { return s }

  return '\'' + s.replace(/'/g, '\'"\'"\'') + '\''
}
