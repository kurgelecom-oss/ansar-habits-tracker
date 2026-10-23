#!/usr/bin/env node
// Ansar's Friday report: report.json -> email-safe HTML + plain text + one ring PNG.
// Used by the Friday 6pm Cowork routine (fetched from GitHub raw), so: no deps, Node 18+.
//   node render.mjs report.json outdir
// Writes outdir/report.html, report.txt, ring.png, ring.b64.txt. Exits 1 if the self-check fails.
// The HTML references the ring as cid:att0 — the Gmail MCP maps that to attachments[0] (inline:true).
// Schema: see README.md next to this file. Every figure comes from the routine; nothing is computed here
// except percentages for display.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const C = {
  page: '#FAFBF2', card: '#FFFFFF', line: '#E4EAD6', ink: '#16250E', muted: '#6C7A5E',
  green: '#5BA524', amber: '#FFB200',
  red: '#C8442F', // not in tk's palette: the one alert colour, used only for RED and zero areas
};
const FONT = "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
const VERDICT = { GREEN: C.green, 'PROVISIONAL GREEN': C.green, YELLOW: C.amber, RED: C.red };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = (n, d) => (d > 0 ? Math.round((100 * n) / d) : 0);
const t = (size, color, extra = '') => `font-family:${FONT};font-size:${size}px;color:${color};${extra}`;
const td = (bg, style = '', attrs = '') => `<td${bg ? ` bgcolor="${bg}"` : ''} ${attrs} style="${bg ? `background-color:${bg};` : ''}${style}">`;
// 'auto' tables hold the round badges: rounded borders only draw with border-collapse:separate
const table = (inner, w = '100%') => `<table role="presentation" width="${w}" cellpadding="0" cellspacing="0" border="0" style="width:${w};border-collapse:${w === 'auto' ? 'separate' : 'collapse'};">${inner}</table>`;
const kicker = (s) => `<div style="${t(11, C.muted, 'font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:0 0 12px 0;')}">${esc(s)}</div>`;
const card = (inner, bg = C.card) => `<tr>${td('', 'padding:0 16px 14px 16px;')}${table(`<tr>${td(bg, `padding:20px;border:1px solid ${C.line};border-radius:16px;`)}${inner}</td></tr>`)}</td></tr>`;

// ---------- ring PNG ----------
function hex(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function ringPng(rings, size = 300) {
  const SS = 3, cx = size / 2, cy = size / 2, th = size * 0.075, gap = size * 0.03;
  const bg = hex(C.card), track = hex(C.line);
  const specs = rings.map((r, i) => {
    const rad = size / 2 - th / 2 - 2 - i * (th + gap);
    const f = Math.max(0, Math.min(1, r.frac));
    const end = f * 2 * Math.PI;
    return { rad, f, col: hex(r.color), ex: cx + rad * Math.sin(end), ey: cy - rad * Math.cos(end), sx: cx, sy: cy - rad };
  });
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
        let a = Math.atan2(dx, -dy); if (a < 0) a += 2 * Math.PI;
        let c = bg;
        for (const s of specs) {
          const onBand = Math.abs(d - s.rad) <= th / 2;
          const cap = s.f > 0 && (Math.hypot(px - s.sx, py - s.sy) <= th / 2 || Math.hypot(px - s.ex, py - s.ey) <= th / 2);
          if (onBand) c = s.f >= 1 || a <= s.f * 2 * Math.PI ? s.col : track;
          if (cap) c = s.col;
          if (onBand || cap) break;
        }
        acc = acc.map((v, k) => v + c[k]);
      }
      for (let k = 0; k < 3; k++) row[1 + x * 3 + k] = Math.round(acc[k] / (SS * SS));
    }
    rows.push(row);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- blocks ----------
function header(r) {
  return `<tr>${td('', 'padding:8px 20px 18px 20px;')}
    <div style="${t(11, C.muted, 'font-weight:700;letter-spacing:1.5px;text-transform:uppercase;')}">Homeschool weekly report · Week ${esc(r.week.number)}</div>
    <div style="${t(28, C.ink, 'font-weight:800;letter-spacing:-0.5px;line-height:1.2;padding-top:6px;')}">${esc(r.student)}'s week</div>
    <div style="${t(14, C.muted, 'padding-top:4px;')}">${esc(r.week.range)} · ${esc(r.week.term)}</div></td></tr>`;
}

function verdictCard(r) {
  const v = r.verdict, col = VERDICT[v.call] || C.muted;
  const light = ['GREEN', 'YELLOW', 'RED'].map((k) => {
    const on = v.call === k || (k === 'GREEN' && v.call === 'PROVISIONAL GREEN');
    const c = VERDICT[k];
    return `${td(on ? c : C.card, `width:14px;height:14px;border-radius:7px;border:2px solid ${c};font-size:0;line-height:0;`, 'width="14" height="14"')}&nbsp;</td>${td('', 'width:6px;font-size:0;', 'width="6"')}&nbsp;</td>`;
  }).join('');
  const strict = v.strict ? `<div style="${t(13, C.ink, `padding:12px 14px;margin-top:14px;border-left:4px solid ${VERDICT[v.strict.call] || C.muted};`)}"><span style="font-weight:700;">Strict count: ${esc(v.strict.call)}.</span> ${esc(v.strict.why)}</div>` : '';
  return card(`${table(`<tr>${td('', 'vertical-align:middle;')}${kicker('The call')}</td>${td('', 'vertical-align:top;', 'align="right"')}${table(`<tr>${light}</tr>`, 'auto')}</td></tr>`)}
    ${table(`<tr>${td(col, `padding:8px 16px;border-radius:999px;`, 'align="center"')}<span style="${t(22, v.call === 'YELLOW' ? C.ink : '#FFFFFF', 'font-weight:800;letter-spacing:1px;')}">${esc(v.call)}</span></td></tr>`, 'auto')}
    <div style="${t(17, C.ink, 'font-weight:600;line-height:1.45;padding-top:14px;')}">${esc(v.headline)}</div>${strict}`);
}

const DAY = {
  full: { bg: C.green, fg: '#FFFFFF', mark: '&#10003;', border: C.green },
  caveat: { bg: C.amber, fg: C.ink, mark: '&#10003;', border: C.amber },
  partial: { bg: C.line, fg: C.ink, mark: null, border: C.line },
  none: { bg: C.card, fg: C.red, mark: '&#10005;', border: C.red },
  flex: { bg: C.card, fg: C.muted, mark: 'F', border: C.line },
};
function weekCard(r) {
  const cells = r.days.map((d) => {
    const s = DAY[d.status] || DAY.partial;
    const mark = s.mark ?? `${d.blocks ?? 0}/4`;
    return `${td('', 'padding:0 2px;', 'align="center" width="20%"')}
      ${table(`<tr>${td(s.bg, `width:46px;height:46px;border-radius:23px;border:2px solid ${s.border};${t(d.status === 'partial' ? 13 : 18, s.fg, 'font-weight:800;line-height:46px;')}`, 'align="center" width="46" height="46"')}${mark}</td></tr>`, 'auto')}
      <div style="${t(12, C.ink, 'font-weight:700;padding-top:6px;')}">${esc(d.label)}</div>
      <div style="${t(11, C.muted)}">${d.logs != null ? `${esc(d.logs)} logs` : d.status === 'flex' ? 'flex' : `${d.blocks ?? 0}/4 blocks`}</div></td>`;
  }).join('');
  const legend = [['full', 'Full'], ['caveat', 'Full, backfilled'], ['partial', 'Part'], ['none', 'Nothing']]
    .map(([k, l]) => `<span style="${t(11, C.muted)}"><span style="color:${DAY[k].border === C.line ? C.muted : DAY[k].border};">&#9679;</span> ${l}</span>`).join('&nbsp;&nbsp; ');
  return card(`${kicker('Day by day')}${table(`<tr>${cells}</tr>`)}<div style="padding-top:14px;line-height:1.8;">${legend}</div>`);
}

function ringsCard(r) {
  const legend = r.rings.map((g) => `<tr>${td('', 'padding:0 0 12px 0;vertical-align:top;')}
      <div style="${t(11, C.muted, 'font-weight:700;letter-spacing:1px;text-transform:uppercase;')}"><span style="color:${g.color};font-size:14px;">&#9679;</span> ${esc(g.label)}</div>
      <div style="${t(20, C.ink, 'font-weight:800;')}">${esc(g.value)}</div>${g.note ? `<div style="${t(12, C.muted)}">${esc(g.note)}</div>` : ''}</td></tr>`).join('');
  return card(`${kicker('The four numbers')}${table(`<tr>${td('', 'width:140px;vertical-align:middle;padding-right:14px;', 'width="140"')}<img src="cid:att0" width="140" height="140" alt="${esc(r.rings.map((g) => `${g.label} ${g.value}`).join(', '))}" style="display:block;width:140px;height:140px;border:0;"></td>${td('', 'vertical-align:middle;')}${table(legend)}</td></tr>`)}`);
}

const BLK = {
  done: { c: C.green, m: '&#9679;' }, backfilled: { c: C.amber, m: '&#9679;' }, off_plan: { c: C.amber, m: '&#9670;' },
  missing: { c: C.red, m: '&#9675;' }, flex: { c: C.muted, m: '&#8211;' },
};
function blocksCard(r) {
  const days = r.blocks.days;
  const head = `<tr>${td('', 'padding:0 0 8px 0;')}</td>${days.map((d) => `${td('', `${t(11, C.muted, 'font-weight:700;')}padding:0 0 8px 0;`, 'align="center"')}${esc(d)}</td>`).join('')}</tr>`;
  const rows = r.blocks.rows.map((row) => `<tr>${td('', `${t(13, C.ink, 'font-weight:600;')}padding:8px 6px 8px 0;border-top:1px solid ${C.line};white-space:nowrap;`)}${esc(row.label)}</td>${row.cells.map((s) => {
    const b = BLK[s] || BLK.flex;
    return `${td('', `${t(18, b.c)}padding:6px 0;border-top:1px solid ${C.line};`, 'align="center"')}${b.m}</td>`;
  }).join('')}</tr>`).join('');
  const legend = [['done', 'Same day'], ['backfilled', 'Backfilled'], ['off_plan', 'Off plan'], ['missing', 'Missing']]
    .map(([k, l]) => `<span style="${t(11, C.muted)}"><span style="color:${BLK[k].c};">${BLK[k].m}</span> ${l}</span>`).join('&nbsp;&nbsp; ');
  return card(`${kicker('The four blocks')}${table(head + rows)}<div style="padding-top:12px;line-height:1.8;">${legend}</div>`);
}

function areasCard(r) {
  const max = Math.max(1, ...r.areas.map((a) => Math.max(a.count, a.prior ?? 0)));
  const tile = (a) => {
    if (!a) return td('', 'width:50%;');
    const zero = a.count === 0, up = a.prior == null ? '' : a.count > a.prior ? '&#9650;' : a.count < a.prior ? '&#9660;' : '=';
    const upc = a.prior == null ? C.muted : a.count > a.prior ? C.green : a.count < a.prior ? C.red : C.muted;
    const w = Math.max(zero ? 0 : 6, pct(a.count, max));
    const bar = zero ? `<div style="${t(11, C.red, 'font-weight:700;padding-top:6px;')}">ZERO</div>`
      : table(`<tr>${td(C.green, `height:6px;border-radius:3px;font-size:0;line-height:0;`, `width="${w}%" height="6"`)}&nbsp;</td>${w < 100 ? `${td(C.line, 'height:6px;font-size:0;line-height:0;', `width="${100 - w}%" height="6"`)}&nbsp;</td>` : ''}</tr>`);
    return `${td('', 'width:50%;padding:5px;vertical-align:top;', 'width="50%"')}${table(`<tr>${td(zero ? '#FBEDEA' : C.page, `padding:12px;border-radius:12px;border:1px solid ${zero ? C.red : C.line};`)}
      <div style="${t(11, C.muted, 'font-weight:700;letter-spacing:0.5px;text-transform:uppercase;')}">${esc(a.name)}</div>
      <div style="${t(24, zero ? C.red : C.ink, 'font-weight:800;padding-top:2px;')}">${a.count} <span style="${t(12, upc, 'font-weight:700;')}">${up}${a.prior == null ? '' : ` ${a.prior} last wk`}</span></div>
      <div style="padding-top:6px;">${bar}</div></td></tr>`)}</td>`;
  };
  let rows = '';
  for (let i = 0; i < r.areas.length; i += 2) rows += `<tr>${tile(r.areas[i])}${tile(r.areas[i + 1])}</tr>`;
  const zeros = r.areas.filter((a) => a.count === 0 && a.why);
  const why = zeros.map((a) => `<div style="${t(13, C.ink, 'padding-top:10px;line-height:1.5;')}"><span style="color:${C.red};font-weight:700;">${esc(a.name)}:</span> ${esc(a.why)}</div>`).join('');
  return card(`${kicker(`Eight VRQA areas · ${r.areas.filter((a) => a.count > 0).length} of 8 touched`)}${table(rows)}${why}`);
}

function listCard(title, items, icon, color) {
  if (!items?.length) return '';
  const rows = items.map((it) => `<tr>${td('', 'width:30px;vertical-align:top;padding:2px 0 14px 0;', 'width="30"')}${table(`<tr>${td(color, `width:22px;height:22px;border-radius:11px;${t(12, color === C.amber ? C.ink : '#FFFFFF', 'font-weight:800;line-height:22px;')}`, 'align="center" width="22" height="22"')}${icon}</td></tr>`, 'auto')}</td>${td('', 'vertical-align:top;padding:0 0 14px 0;')}
      <div style="${t(15, C.ink, 'font-weight:700;line-height:1.35;')}">${esc(it.title)}</div>
      ${it.detail ? `<div style="${t(13, C.muted, 'line-height:1.5;padding-top:3px;')}">${esc(it.detail)}</div>` : ''}</td></tr>`).join('');
  return card(`${kicker(title)}${table(rows)}`);
}

function wordsCard(r) {
  if (!r.words?.length) return '';
  const rows = r.words.map((w) => `<tr>${td('', `padding:12px 0;border-top:1px solid ${C.line};vertical-align:top;`)}
      ${table(`<tr>${td('', 'vertical-align:top;')}<div style="${t(14, C.ink, 'font-weight:700;')}">${esc(w.theme)}</div></td>${td('', 'vertical-align:top;', 'align="right"')}${table(`<tr>${td(C.line, `padding:3px 10px;border-radius:999px;${t(12, C.ink, 'font-weight:800;white-space:nowrap;')}`)}${esc(w.days)}</td></tr>`, 'auto')}</td></tr>`)}
      <div style="${t(14, C.muted, 'font-style:italic;line-height:1.5;padding-top:6px;')}">&ldquo;${esc(w.quote)}&rdquo;</div></td></tr>`).join('');
  const j = r.journals ? `<div style="${t(13, C.ink, 'padding-top:12px;')}"><span style="font-weight:700;">Journals:</span> ${r.journals.this_week} this week · ${esc(r.journals.prior)}</div>` : '';
  return card(`${kicker('In his own words')}${table(rows)}${j}`);
}

function actionsCard(r) {
  const rows = r.actions.map((a, i) => `<tr>${td('', 'width:44px;vertical-align:top;padding:0 0 16px 0;', 'width="44"')}${table(`<tr>${td(C.ink, `width:32px;height:32px;border-radius:16px;${t(15, '#FFFFFF', 'font-weight:800;line-height:32px;')}`, 'align="center" width="32" height="32"')}${i + 1}</td></tr>`, 'auto')}</td>${td('', 'vertical-align:top;padding:0 0 16px 0;')}
      <div style="${t(15, C.ink, 'font-weight:700;line-height:1.35;')}">${esc(a.title)}</div>
      <div style="${t(13, C.muted, 'line-height:1.5;padding-top:3px;')}">${esc(a.detail || '')}</div>
      <div style="${t(11, C.green, 'font-weight:700;letter-spacing:0.5px;text-transform:uppercase;padding-top:5px;')}">${esc(a.owner || '')}${a.when ? ` · ${esc(a.when)}` : ''}</div></td></tr>`).join('');
  const last = r.last_actions?.length ? `<div style="padding-top:4px;border-top:1px solid ${C.line};">${kicker('')}<div style="${t(11, C.muted, 'font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:10px 0 8px 0;')}">Last week's three</div>${r.last_actions.map((l) => {
    const c = l.status === 'done' ? C.green : l.status === 'partly' ? C.amber : C.red;
    const m = l.status === 'done' ? '&#10003;' : l.status === 'partly' ? '&#189;' : '&#10005;';
    return `<div style="${t(13, C.ink, 'line-height:1.5;padding:2px 0;')}"><span style="color:${c};font-weight:800;">${m}</span>&nbsp; ${esc(l.title)}</div>`;
  }).join('')}</div>` : '';
  return card(`${kicker('Three things for next week')}${table(rows)}${last}`);
}

function noteCard(r) {
  if (!r.note_to_taylan?.length) return '';
  const paras = r.note_to_taylan.map((p) => `<div style="${t(14, '#FFFFFF', 'line-height:1.55;padding-top:8px;')}">${esc(p)}</div>`).join('');
  return `<tr>${td('', 'padding:0 16px 14px 16px;')}${table(`<tr>${td(C.ink, 'padding:20px;border-radius:16px;')}<div style="${t(11, C.amber, 'font-weight:700;letter-spacing:1.5px;text-transform:uppercase;')}">Note to Taylan</div>${paras}</td></tr>`)}</td></tr>`;
}

function flagsCard(r) {
  const f = r.flags; if (!f) return '';
  const all = [...(f.notion || []).map((x) => ({ ...x, src: 'Notion' })), ...(f.found || []).map((x) => ({ ...x, src: 'This report' }))];
  if (!all.length) return '';
  const rows = all.map((x) => `<tr>${td('', `padding:8px 0;border-top:1px solid ${C.line};vertical-align:top;${t(13, C.ink, 'line-height:1.45;')}`)}<span style="color:${C.amber};">&#9888;</span>&nbsp;<span style="font-weight:700;">${esc(x.title)}</span> <span style="color:${C.muted};">${esc(x.detail || '')}</span></td>${td('', `padding:8px 0 8px 8px;border-top:1px solid ${C.line};vertical-align:top;white-space:nowrap;${t(11, C.muted)}`, 'align="right"')}${esc(x.src)}</td></tr>`).join('');
  return card(`${kicker(`Data integrity · ${all.length} flags`)}${table(rows)}`);
}

function footer(r) {
  const s = r.sources || {};
  return `<tr>${td('', 'padding:6px 24px 28px 24px;')}<div style="${t(11, C.muted, 'line-height:1.6;')}">
    ${esc(s.summary || '')}<br>${esc(s.cross_check || '')}${s.not_recorded ? `<br>Not recorded anywhere: ${esc(s.not_recorded)}` : ''}<br>Generated ${esc(r.generated_at || '')}</div></td></tr>`;
}

// ---------- plain text (mobile fallback + what the 7:30pm week-film routine reads) ----------
function text(r) {
  const L = [];
  L.push(`ANSAR — HOMESCHOOL WEEKLY REPORT`, `Week ${r.week.number} · ${r.week.range} · ${r.week.term}`, '');
  L.push(`THE CALL: ${r.verdict.call}`, r.verdict.headline);
  if (r.verdict.strict) L.push(`Strict count: ${r.verdict.strict.call}. ${r.verdict.strict.why}`);
  for (const p of r.verdict.detail || []) L.push('', p);
  L.push('', 'THE FOUR NUMBERS');
  for (const g of r.rings) L.push(`- ${g.label}: ${g.value}${g.note ? ` (${g.note})` : ''}`);
  L.push('', 'DAY BY DAY');
  for (const d of r.days) L.push(`- ${d.label}: ${d.status}${d.blocks != null ? `, ${d.blocks}/4 blocks` : ''}${d.logs != null ? `, ${d.logs} logs` : ''}${d.note ? ` — ${d.note}` : ''}`);
  L.push('', 'BLOCKS (' + r.blocks.days.join(' / ') + ')');
  for (const row of r.blocks.rows) L.push(`- ${row.label}: ${row.cells.join(' / ')}`);
  L.push('', 'VRQA COVERAGE, ALL EIGHT AREAS (prior week in brackets)');
  for (const a of r.areas) L.push(`- ${a.name} ${a.count}${a.prior != null ? ` (${a.prior})` : ''}${a.count === 0 ? ' — ZERO' : ''}${a.why ? ` — ${a.why}` : ''}`);
  const list = (h, xs) => { if (!xs?.length) return; L.push('', h); xs.forEach((x, i) => L.push(`${i + 1}. ${x.title}${x.detail ? ` ${x.detail}` : ''}`)); };
  list('WHERE HE WAS STRONG', r.strengths);
  list('WHERE IT BROKE', r.weaknesses);
  if (r.flags) { list('DATA INTEGRITY FLAGS (NOTION)', r.flags.notion); list('FOUND BY THIS REPORT', r.flags.found); }
  if (r.words?.length) { L.push('', 'IN HIS OWN WORDS'); for (const w of r.words) L.push(`- ${w.theme} — ${w.days}. "${w.quote}"`); }
  if (r.journals) L.push(`- Journals: ${r.journals.this_week} this week. ${r.journals.prior}`);
  L.push('', 'THREE THINGS FOR NEXT WEEK');
  r.actions.forEach((a, i) => L.push(`${i + 1}. ${a.title} ${a.detail || ''}${a.owner ? ` [${a.owner}${a.when ? `, ${a.when}` : ''}]` : ''}`));
  if (r.last_actions?.length) { L.push('', "LAST WEEK'S THREE"); for (const l of r.last_actions) L.push(`- [${l.status}] ${l.title}`); }
  if (r.note_to_taylan?.length) { L.push('', 'NOTE TO TAYLAN', ...r.note_to_taylan); }
  const s = r.sources || {};
  L.push('', 'SOURCES AND CROSS-CHECK', s.summary || '', s.cross_check || '');
  if (s.not_recorded) L.push(`Not recorded anywhere: ${s.not_recorded}`);
  L.push('', `Generated ${r.generated_at || ''}`);
  return L.join('\n');
}

function html(r) {
  const body = [header(r), verdictCard(r), weekCard(r), ringsCard(r), blocksCard(r), areasCard(r),
    listCard('Where he was strong', r.strengths, '&#10003;', C.green),
    listCard('Where it broke', r.weaknesses, '!', C.amber),
    wordsCard(r), actionsCard(r), noteCard(r), flagsCard(r), footer(r)].join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="width:100%;background-color:${C.page};"><tr><td align="center" style="padding:20px 0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;">
${body}
</table></td></tr></table></body></html>`;
}

function check(r, out) {
  const errs = [];
  for (const k of ['student', 'week', 'verdict', 'rings', 'days', 'blocks', 'areas', 'actions']) if (r[k] == null) errs.push(`missing ${k}`);
  if (r.rings?.length !== 4) errs.push('rings must have exactly 4 entries');
  if (r.areas?.length !== 8) errs.push('areas must have exactly 8 entries');
  if (r.actions?.length !== 3) errs.push('actions must have exactly 3 entries');
  if (!VERDICT[r.verdict?.call]) errs.push(`verdict.call must be one of ${Object.keys(VERDICT).join(', ')}`);
  if (/<style|class=|display:\s*(flex|grid)|<svg|https?:\/\/[^"]*\.(png|jpe?g|gif)/i.test(out)) errs.push('forbidden markup in HTML');
  if (/<(div|span|p)[^>]*background/i.test(out)) errs.push('background on div/span/p');
  const allowed = new Set(Object.values(C).map((x) => x.toUpperCase()).concat(['#FFFFFF', '#FBEDEA']));
  for (const h of out.match(/#[0-9A-Fa-f]{6}\b/g) || []) if (!allowed.has(h.toUpperCase())) errs.push(`off-palette colour ${h}`);
  return [...new Set(errs)];
}

export function render(r) {
  const R = { ...r, rings: (r.rings || []).map((g, i) => ({ ...g, color: g.color || [C.green, C.amber, C.ink, C.muted][i] })) };
  const out = html(R);
  return { html: out, text: text(R), png: ringPng(R.rings.map((g) => ({ frac: g.d > 0 ? g.n / g.d : 0, color: g.color }))), errors: check(R, out) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , input, outdir = '.'] = process.argv;
  if (!input) { console.error('usage: node render.mjs report.json [outdir]'); process.exit(2); }
  const res = render(JSON.parse(readFileSync(input, 'utf8')));
  mkdirSync(outdir, { recursive: true });
  writeFileSync(`${outdir}/report.html`, res.html);
  writeFileSync(`${outdir}/report.txt`, res.text);
  writeFileSync(`${outdir}/ring.png`, res.png);
  writeFileSync(`${outdir}/ring.b64.txt`, res.png.toString('base64'));
  if (res.errors.length) { console.error('SELF-CHECK FAILED:\n- ' + res.errors.join('\n- ')); process.exit(1); }
  console.log(`ok html=${res.html.length}B text=${res.text.length}B ring.png=${res.png.length}B base64=${res.png.toString('base64').length} chars`);
}
