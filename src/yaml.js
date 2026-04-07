/**
 * Minimal YAML parser for plaintest .flow files.
 * Handles the subset of YAML used in .flow files:
 *   - Top-level key: value pairs
 *   - Inline arrays: [a, b, c]
 *   - Block sequences (steps):
 *       - step one
 *       - step two
 *   - Quoted and unquoted string values
 *   - Boolean and number values
 *   - Nested objects: viewport: { width: 1280, height: 720 }
 *
 * Zero external dependencies — pure Node.js built-ins only.
 */

export function parseYaml(text) {
  const lines = text.split('\n');
  const result = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and blank lines
    if (!trimmed || trimmed.startsWith('#')) { i++; continue; }

    // Top-level key: value
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key   = trimmed.slice(0, colonIdx).trim();
    const after = trimmed.slice(colonIdx + 1).trim();

    // Block sequence (steps):
    if (after === '' || after === null) {
      // Check if next lines are a block sequence
      if (i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
        const items = [];
        i++;
        while (i < lines.length) {
          const sl = lines[i].trim();
          if (sl.startsWith('- ')) {
            items.push(unquote(sl.slice(2).trim()));
            i++;
          } else if (!sl || sl.startsWith('#')) {
            i++;
          } else if (sl.includes(':')) {
            break; // Next top-level key
          } else {
            i++;
          }
        }
        result[key] = items;
        continue;
      }
      // Inline object on next line: viewport: { width: 1280, height: 720 }
      result[key] = null;
      i++;
      continue;
    }

    // Inline array: [a, b, c]
    if (after.startsWith('[')) {
      const inner = after.slice(1, after.lastIndexOf(']'));
      result[key] = inner.split(',').map(s => unquote(s.trim())).filter(Boolean);
      i++;
      continue;
    }

    // Inline object: { width: 1280, height: 720 }
    if (after.startsWith('{')) {
      const inner = after.slice(1, after.lastIndexOf('}'));
      const obj = {};
      for (const part of inner.split(',')) {
        const [k, v] = part.split(':');
        if (k && v !== undefined) {
          obj[k.trim()] = coerce(v.trim());
        }
      }
      result[key] = obj;
      i++;
      continue;
    }

    // Simple scalar
    result[key] = coerce(unquote(after));
    i++;
  }

  return result;
}

function unquote(s) {
  if (!s) return s;
  if ((s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerce(s) {
  if (s === 'true')  return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  const n = Number(s);
  if (!isNaN(n) && s !== '') return n;
  return s;
}
