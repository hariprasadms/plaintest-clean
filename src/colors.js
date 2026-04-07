// Inlined colour support — zero external dependencies
// Based on picocolors by Alexey Raspopov (ISC licence)

const env = process.env || {};
const argv = process.argv || [];

const enabled =
  !(env.NO_COLOR || argv.includes('--no-color')) &&
  (env.FORCE_COLOR || argv.includes('--color') ||
   process.platform === 'win32' ||
   ((process.stdout || {}).isTTY && env.TERM !== 'dumb') ||
   env.CI);

const fmt = (open, close) => enabled
  ? (s) => `${open}${s}${close}`
  : (s) => String(s);

const pc = {
  bold:    fmt('\x1b[1m',  '\x1b[22m'),
  dim:     fmt('\x1b[2m',  '\x1b[22m'),
  red:     fmt('\x1b[31m', '\x1b[39m'),
  green:   fmt('\x1b[32m', '\x1b[39m'),
  yellow:  fmt('\x1b[33m', '\x1b[39m'),
  blue:    fmt('\x1b[34m', '\x1b[39m'),
  magenta: fmt('\x1b[35m', '\x1b[39m'),
  cyan:    fmt('\x1b[36m', '\x1b[39m'),
  white:   fmt('\x1b[37m', '\x1b[39m'),
  gray:    fmt('\x1b[90m', '\x1b[39m'),
};

export default pc;
