/**
 * Step interpreter — maps plain English steps to Playwright actions.
 *
 * Supported step patterns:
 *
 * NAVIGATION
 *   navigate to {url}
 *   go to {url}
 *   open {url}
 *   reload the page / refresh
 *   go back / go forward
 *
 * ACTIONS
 *   click {text|label}
 *   click the {text} button
 *   click the {text} link
 *   double click {text}
 *   fill {field} with "{value}"
 *   type "{value}" into {field}
 *   clear {field}
 *   select "{option}" from {field}
 *   check {label}
 *   uncheck {label}
 *   press {key}
 *   hover over {text}
 *   scroll to {text}
 *
 * ASSERTIONS
 *   assert heading says "{text}"
 *   assert text "{text}" is visible
 *   assert text "{text}" is not visible
 *   assert url contains "{text}"
 *   assert url is "{url}"
 *   assert title is "{text}"
 *   assert {field} has value "{value}"
 *   assert button "{text}" is disabled
 *   assert button "{text}" is enabled
 *   assert element "{selector}" exists
 *   assert element "{selector}" does not exist
 *   assert page contains "{text}"
 *
 * WAITS
 *   wait {n} seconds
 *   wait for "{text}" to appear
 *   wait for "{text}" to disappear
 *   wait for network
 *
 * UTILITIES
 *   take screenshot
 *   take screenshot "{name}"
 *   log "{message}"
 */

export function interpretStep(raw) {
  const s = raw.trim();
  const sl = s.toLowerCase();

  // ─── NAVIGATION ───────────────────────────────────
  {
    const m = sl.match(/^(?:navigate to|go to|open)\s+(.+)$/);
    if (m) return { action: 'navigate', url: m[1].trim() };
  }

  if (/^(?:reload|refresh)(?: the page)?$/.test(sl))
    return { action: 'reload' };

  if (/^go back$/.test(sl)) return { action: 'back' };
  if (/^go forward$/.test(sl)) return { action: 'forward' };

  // ─── CLICK ────────────────────────────────────────
  {
    const m = s.match(/^(?:double[ -]click)\s+(?:the\s+)?(.+?)(?:\s+(?:button|link|tab|option))?$/i);
    if (m) return { action: 'dblclick', target: m[1].trim() };
  }
  {
    const m = s.match(/^click\s+(?:the\s+)?(.+?)(?:\s+(?:button|link|tab|option|icon|checkbox|radio))?$/i);
    if (m) return { action: 'click', target: m[1].trim() };
  }

  // ─── FILL / TYPE ──────────────────────────────────
  {
    // fill {field} with "{value}"
    const m = s.match(/^fill\s+(.+?)\s+with\s+"([^"]+)"$/i);
    if (m) return { action: 'fill', field: m[1].trim(), value: m[2] };
  }
  {
    // type "{value}" into {field}
    const m = s.match(/^type\s+"([^"]+)"\s+into\s+(.+)$/i);
    if (m) return { action: 'fill', field: m[2].trim(), value: m[1] };
  }
  {
    // clear {field}
    const m = s.match(/^clear\s+(.+)$/i);
    if (m) return { action: 'clear', field: m[1].trim() };
  }

  // ─── SELECT ───────────────────────────────────────
  {
    const m = s.match(/^select\s+"([^"]+)"\s+from\s+(.+)$/i);
    if (m) return { action: 'select', option: m[1], field: m[2].trim() };
  }

  // ─── CHECK / UNCHECK ──────────────────────────────
  {
    const m = s.match(/^(?:un)?check\s+(.+)$/i);
    if (m) return {
      action: sl.startsWith('uncheck') ? 'uncheck' : 'check',
      label:  m[1].trim(),
    };
  }

  // ─── KEYBOARD ─────────────────────────────────────
  {
    const m = s.match(/^press\s+(.+)$/i);
    if (m) return { action: 'press', key: m[1].trim() };
  }

  // ─── HOVER ────────────────────────────────────────
  {
    const m = s.match(/^hover\s+(?:over\s+)?(.+)$/i);
    if (m) return { action: 'hover', target: m[1].trim() };
  }

  // ─── SCROLL ───────────────────────────────────────
  {
    const m = s.match(/^scroll\s+(?:to\s+)?(.+)$/i);
    if (m) return { action: 'scroll', target: m[1].trim() };
  }

  // ─── ASSERTIONS ───────────────────────────────────
  {
    const m = s.match(/^assert\s+(?:the\s+)?heading\s+(?:says|is)\s+"([^"]+)"$/i);
    if (m) return { action: 'assertHeading', text: m[1] };
  }
  {
    const m = s.match(/^assert\s+(?:the\s+)?text\s+"([^"]+)"\s+is\s+visible$/i);
    if (m) return { action: 'assertVisible', text: m[1] };
  }
  {
    const m = s.match(/^assert\s+(?:the\s+)?text\s+"([^"]+)"\s+is\s+not\s+visible$/i);
    if (m) return { action: 'assertHidden', text: m[1] };
  }
  {
    const m = s.match(/^assert\s+url\s+contains\s+"([^"]+)"$/i);
    if (m) return { action: 'assertUrlContains', text: m[1] };
  }
  {
    const m = s.match(/^assert\s+url\s+is\s+"([^"]+)"$/i);
    if (m) return { action: 'assertUrl', url: m[1] };
  }
  {
    const m = s.match(/^assert\s+title\s+(?:is|says)\s+"([^"]+)"$/i);
    if (m) return { action: 'assertTitle', text: m[1] };
  }
  {
    const m = s.match(/^assert\s+(?:the\s+)?(.+?)\s+(?:has|have)\s+value\s+"([^"]+)"$/i);
    if (m) return { action: 'assertValue', field: m[1].trim(), value: m[2] };
  }
  {
    const m = s.match(/^assert\s+(?:the\s+)?(?:button\s+)?"([^"]+)"\s+is\s+disabled$/i);
    if (m) return { action: 'assertDisabled', target: m[1] };
  }
  {
    const m = s.match(/^assert\s+(?:the\s+)?(?:button\s+)?"([^"]+)"\s+is\s+enabled$/i);
    if (m) return { action: 'assertEnabled', target: m[1] };
  }
  {
    const m = s.match(/^assert\s+(?:the\s+)?page\s+contains\s+"([^"]+)"$/i);
    if (m) return { action: 'assertPageContains', text: m[1] };
  }
  {
    const m = s.match(/^assert\s+element\s+"([^"]+)"\s+(?:exists|is\s+present)$/i);
    if (m) return { action: 'assertExists', selector: m[1] };
  }
  {
    const m = s.match(/^assert\s+element\s+"([^"]+)"\s+does\s+not\s+exist$/i);
    if (m) return { action: 'assertNotExists', selector: m[1] };
  }

  // ─── WAITS ────────────────────────────────────────
  {
    const m = s.match(/^wait\s+(\d+(?:\.\d+)?)\s+seconds?$/i);
    if (m) return { action: 'wait', ms: Math.round(parseFloat(m[1]) * 1000) };
  }
  {
    const m = s.match(/^wait\s+for\s+"([^"]+)"\s+to\s+appear$/i);
    if (m) return { action: 'waitForVisible', text: m[1] };
  }
  {
    const m = s.match(/^wait\s+for\s+"([^"]+)"\s+to\s+disappear$/i);
    if (m) return { action: 'waitForHidden', text: m[1] };
  }
  if (/^wait\s+for\s+network(?:\s+idle)?$/.test(sl))
    return { action: 'waitForNetwork' };

  // ─── UTILITIES ────────────────────────────────────
  {
    const m = s.match(/^take\s+screenshot(?:\s+"([^"]+)")?$/i);
    if (m) return { action: 'screenshot', name: m[1] || null };
  }
  {
    const m = s.match(/^log\s+"([^"]+)"$/i);
    if (m) return { action: 'log', message: m[1] };
  }

  // Unknown — will surface a clear error
  return { action: 'unknown', raw: s };
}

/**
 * Resolve a text target to a Playwright locator.
 * Tries: getByRole, getByLabel, getByText, getByPlaceholder.
 */
export function resolveTarget(page, target) {
  // If it looks like a CSS/XPath selector, use locator directly
  if (target.startsWith('#') || target.startsWith('.') || target.startsWith('//') || target.startsWith('[')) {
    return page.locator(target);
  }
  // Try getByRole (button / link / heading) from target phrasing
  // Return a union locator — Playwright will use whichever matches
  return page.getByRole('button', { name: new RegExp(escapeReg(target), 'i') })
    .or(page.getByRole('link',    { name: new RegExp(escapeReg(target), 'i') }))
    .or(page.getByLabel(new RegExp(escapeReg(target), 'i')))
    .or(page.getByText(new RegExp(escapeReg(target), 'i')))
    .first();
}

export function resolveField(page, field) {
  return page.getByLabel(new RegExp(escapeReg(field), 'i'))
    .or(page.getByPlaceholder(new RegExp(escapeReg(field), 'i')))
    .or(page.getByRole('textbox', { name: new RegExp(escapeReg(field), 'i') }))
    .or(page.getByRole('combobox', { name: new RegExp(escapeReg(field), 'i') }))
    .first();
}

/**
 * Resolve a select/dropdown field to a Playwright locator.
 * Extends resolveField with attribute-based fallbacks for unlabeled <select>
 * elements (matched by id, name, or title containing the field text).
 */
export function resolveSelect(page, field) {
  const re    = new RegExp(escapeReg(field), 'i');
  const lower = field.toLowerCase();
  return page.getByRole('combobox', { name: re })
    .or(page.getByLabel(re))
    .or(page.locator(`select[id*="${lower}"], select[name*="${lower}"], select[title*="${lower}"]`))
    .first();
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
