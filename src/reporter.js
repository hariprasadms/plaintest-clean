import fs from 'fs';

export function renderReport(results, outputPath, suiteDuration) {
  const totalPassed = results.reduce((n, r) => n + r.passed, 0);
  const totalFailed = results.reduce((n, r) => n + r.failed, 0);
  const totalSteps  = results.reduce((n, r) => n + r.total, 0);
  const score       = totalSteps > 0 ? Math.round((totalPassed / totalSteps) * 100) : 100;
  const allPassed   = totalFailed === 0;
  const date        = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const suiteRows = results.map((r, ri) => {
    const stepRows = r.steps.map((s, si) => {
      const icon  = s.passed ? '✓' : '✕';
      const cls   = s.passed ? 'pass' : 'fail';
      const err   = s.error  ? `<div class="err-msg">${esc(s.error.split('\n')[0].slice(0, 200))}</div>` : '';
      const shot  = s.screenshot ? `<a href="${s.screenshot}" target="_blank" class="ss-link">screenshot</a>` : '';
      return `
        <tr class="step-row ${cls}">
          <td class="step-icon ${cls}">${icon}</td>
          <td class="step-raw">${esc(s.raw)} ${shot}</td>
          <td class="step-time">${s.duration}ms</td>
        </tr>
        ${s.error ? `<tr class="err-row"><td colspan="3">${err}</td></tr>` : ''}
      `;
    }).join('');

    const status = r.error ? 'error' : r.failed > 0 ? 'fail' : 'pass';
    const badge  = r.error ? 'error' : r.failed > 0 ? 'failed' : 'passed';
    const tags   = r.tags?.length ? r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('') : '';

    return `
    <div class="suite-card ${status}" id="suite-${ri}">
      <div class="suite-hdr" onclick="toggleSuite(${ri})">
        <span class="suite-icon">${status === 'pass' ? '✓' : '✕'}</span>
        <span class="suite-name">${esc(r.name)}</span>
        ${tags}
        <span class="suite-badge ${badge}">${badge}</span>
        <span class="suite-meta">${r.passed}/${r.total} steps · ${r.duration}ms</span>
        <span class="suite-caret" id="caret-${ri}">▾</span>
      </div>
      <div class="suite-body" id="body-${ri}">
        ${r.error ? `<p class="parse-err">⚠ ${esc(r.error)}</p>` : ''}
        <table class="step-table">
          <thead><tr><th></th><th>Step</th><th>Time</th></tr></thead>
          <tbody>${stepRows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>plaintest report — ${date}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Prompt',sans-serif;background:#f4f4f8;color:#111;font-size:13px;line-height:1.6;}

header{background:#fff;border-bottom:1px solid #e8e8f0;padding:18px 28px;display:flex;align-items:center;gap:16px;}
.logo{font-size:18px;font-weight:700;color:#111;}
.logo span{color:#534AB7;}
.logo-sub{font-size:11px;font-weight:600;color:#534AB7;background:#EEEDFE;padding:2px 8px;border-radius:4px;}
.run-date{font-size:12px;color:#888;margin-left:auto;}

.summary{max-width:1000px;margin:24px auto 0;padding:0 24px;}

.score-bar{background:#fff;border:1px solid #e8e8f0;border-radius:12px;padding:20px 24px;display:flex;align-items:center;gap:20px;margin-bottom:16px;}
.score-ring{position:relative;width:60px;height:60px;flex-shrink:0;}
.score-ring svg{transform:rotate(-90deg);}
.score-val{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:15px;font-weight:700;}
.score-info h2{font-size:17px;font-weight:700;margin-bottom:3px;}
.score-info p{font-size:12px;color:#666;font-weight:300;}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
.stat{background:#fff;border:1px solid #e8e8f0;border-radius:10px;padding:14px 16px;}
.stat-label{font-size:11px;color:#888;font-weight:500;margin-bottom:5px;}
.stat-value{font-size:22px;font-weight:700;}
.sv-pass{color:#085041;}.sv-fail{color:#A32D2D;}.sv-dur{color:#534AB7;}.sv-tot{color:#333;}

.suites{max-width:1000px;margin:0 auto 40px;padding:0 24px;}

.suite-card{background:#fff;border:1px solid #e8e8f0;border-radius:10px;margin-bottom:10px;overflow:hidden;}
.suite-card.fail{border-left:3px solid #E24B4A;}
.suite-card.pass{border-left:3px solid #1D9E75;}
.suite-card.error{border-left:3px solid #BA7517;}

.suite-hdr{padding:12px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;}
.suite-hdr:hover{background:#fafafa;}
.suite-icon{font-size:13px;width:18px;text-align:center;}
.suite-card.pass .suite-icon{color:#1D9E75;}
.suite-card.fail .suite-icon{color:#E24B4A;}
.suite-name{font-weight:600;font-size:13px;flex:1;}
.suite-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;}
.suite-badge.passed{background:#E1F5EE;color:#085041;}
.suite-badge.failed{background:#FCEBEB;color:#A32D2D;}
.suite-badge.error{background:#FAEEDA;color:#633806;}
.suite-meta{font-size:11px;color:#aaa;}
.suite-caret{font-size:12px;color:#aaa;transition:transform .15s;}
.suite-caret.open{transform:rotate(180deg);}
.tag{font-size:10px;padding:1px 7px;border-radius:10px;background:#EEEDFE;color:#3C3489;margin-right:3px;}

.suite-body{display:none;border-top:1px solid #f0f0f8;padding:0;}
.suite-body.open{display:block;}

.parse-err{padding:12px 16px;color:#A32D2D;font-size:12px;background:#FCEBEB;}

.step-table{width:100%;border-collapse:collapse;}
.step-table th{padding:6px 14px;text-align:left;font-size:10px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #f0f0f8;background:#fafafa;}
.step-row{border-bottom:0.5px solid #f4f4f8;}
.step-row:last-child{border-bottom:none;}
.step-row:hover{background:#fafafa;}
.step-icon{width:28px;text-align:center;padding:8px 6px;font-size:12px;font-weight:700;}
.step-icon.pass{color:#1D9E75;}.step-icon.fail{color:#E24B4A;}
.step-raw{padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:#333;}
.step-time{padding:8px 14px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px;color:#aaa;white-space:nowrap;}
.err-row td{padding:0 14px 8px 42px;}
.err-msg{font-family:'JetBrains Mono',monospace;font-size:11px;color:#A32D2D;background:#FCEBEB;padding:7px 10px;border-radius:5px;}
.ss-link{font-size:10px;color:#534AB7;text-decoration:none;margin-left:8px;padding:1px 6px;border:1px solid #CECBF6;border-radius:3px;}

footer{text-align:center;padding:24px;font-size:11px;color:#aaa;}
footer a{color:#534AB7;text-decoration:none;}
</style>
</head>
<body>

<header>
  <div class="logo">plain<span>test</span></div>
  <div class="logo-sub">open source</div>
  <div class="run-date">Run: ${date} · ${suiteDuration}ms total</div>
</header>

<div class="summary">
  <div class="score-bar">
    <div class="score-ring">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="24" fill="none" stroke="#e8e8f0" stroke-width="5"/>
        <circle cx="30" cy="30" r="24" fill="none"
          stroke="${allPassed ? '#1D9E75' : '#E24B4A'}" stroke-width="5"
          stroke-dasharray="${(score / 100) * (2 * Math.PI * 24)} ${2 * Math.PI * 24}"
          stroke-linecap="round"/>
      </svg>
      <div class="score-val" style="color:${allPassed ? '#1D9E75' : '#E24B4A'}">${score}%</div>
    </div>
    <div class="score-info">
      <h2 style="color:${allPassed ? '#085041' : '#A32D2D'}">${allPassed ? 'All tests passed' : `${totalFailed} step${totalFailed > 1 ? 's' : ''} failed`}</h2>
      <p>${results.length} flow file${results.length > 1 ? 's' : ''} · ${totalSteps} steps · ${date}</p>
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-label">Passed</div><div class="stat-value sv-pass">${totalPassed}</div></div>
    <div class="stat"><div class="stat-label">Failed</div><div class="stat-value sv-fail">${totalFailed}</div></div>
    <div class="stat"><div class="stat-label">Total steps</div><div class="stat-value sv-tot">${totalSteps}</div></div>
    <div class="stat"><div class="stat-label">Duration</div><div class="stat-value sv-dur">${suiteDuration}ms</div></div>
  </div>
</div>

<div class="suites">
  ${suiteRows}
</div>

<footer>
  Generated by <a href="https://github.com/promptqa/plaintest" target="_blank">plaintest</a> · 
  Powered by <a href="https://promptqa.dev" target="_blank">PromptQA</a>
</footer>

<script>
function toggleSuite(i) {
  const body  = document.getElementById('body-'  + i);
  const caret = document.getElementById('caret-' + i);
  body.classList.toggle('open');
  caret.classList.toggle('open');
}
// Auto-expand failed suites
document.querySelectorAll('.suite-card.fail, .suite-card.error').forEach((el, i) => {
  const idx = el.id.replace('suite-', '');
  document.getElementById('body-'  + idx)?.classList.add('open');
  document.getElementById('caret-' + idx)?.classList.add('open');
});
</script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
