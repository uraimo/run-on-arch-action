import * as shlex from '../'

shlex.quote('test text')
shlex.split('test text "multi word thing"')

// Should error
shlex.quote()
shlex.split()
