// Parent emails in the Friday report's card layout (scripts/weekly-report/render.mjs).
// One palette per email type so the type reads before the words do (tk, 26 Oct 2026).
// Gmail keeps inline styles and border-radius on cells; it drops classes, <style>, SVG and data URIs, so none are used.

export type Palette = { page: string; line: string; ink: string; muted: string; accent: string; onAccent: string; soft: string };
const RED = '#C8442F';
export const PALETTES = {
  due: { page: '#FFF8EE', line: '#F3E3C8', ink: '#2E1D05', muted: '#85704F', accent: '#E08A00', onAccent: '#2E1D05', soft: '#FCEFD6' },
  approval: { page: '#F3F6FB', line: '#DCE3F0', ink: '#0F1E3D', muted: '#5B6B88', accent: '#2F5BD3', onAccent: '#FFFFFF', soft: '#E6ECFA' },
  feedback: { page: '#F8F4FA', line: '#E9DDF0', ink: '#2A1433', muted: '#7A6386', accent: '#8A3FA8', onAccent: '#FFFFFF', soft: '#F1E6F6' },
  report: { page: '#F1F8F7', line: '#D5E8E5', ink: '#0E2B2A', muted: '#567370', accent: '#12877A', onAccent: '#FFFFFF', soft: '#DFF1EE' },
  story: { page: '#FBF6F0', line: '#EDE0D0', ink: '#2B1A0E', muted: '#826A55', accent: '#B5562B', onAccent: '#FFFFFF', soft: '#F6E9DC' },
  practice: { page: '#F4F5F7', line: '#E1E4EA', ink: '#1D2330', muted: '#697186', accent: '#4A5568', onAccent: '#FFFFFF', soft: '#EAECF1' },
} satisfies Record<string, Palette>;

const FONT = "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
export const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const t = (size: number, color: string, extra = '') => `font-size:${size}px;color:${color};${extra}`;
const table = (inner: string, auto = false) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${auto ? '' : ' width="100%"'}>${inner}</table>`;
const kicker = (p: Palette, s: string) => `<div style="${t(11, p.muted, 'font-weight:700;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px;')}">${esc(s)}</div>`;
const card = (p: Palette, inner: string) => `<tr><td style="padding:0 16px 14px 16px;">${table(`<tr><td style="background:#FFFFFF;padding:20px;border:1px solid ${p.line};border-radius:16px;">${inner}</td></tr>`)}</td></tr>`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const utc = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
/** 2026-10-31 → Sat 31 Oct */
export const day = (iso: string) => { const d = utc(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
export const daysBetween = (from: string, to: string) => Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000);
export const monthName = (ym: string) => LONG_MONTHS[Number(ym.slice(5, 7)) - 1] ?? '';
/** "English · 2026-10 monthly assessment" → "October monthly assessment"; ISO dates become "Fri 9 Oct". */
export function tidyTitle(subject: string, title: string) {
  return title.replace(new RegExp(`^${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*·\\s*`), '')
    .replace(/\b(\d{4})-(\d{2}) monthly/g, (_, _y, m) => `${LONG_MONTHS[Number(m) - 1]} monthly`)
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, day);
}

export type Header = { kicker: string; title: string; sub: string };
export type Stat = { value: string; label: string; filled?: boolean; alert?: boolean };
export type Row = { title: string; detail?: string; pill: string; alert?: boolean };

function header(p: Palette, h: Header) {
  return `<tr><td style="padding:8px 20px 18px 20px;">
    <div style="${t(11, p.accent, 'font-weight:800;letter-spacing:1.5px;text-transform:uppercase;')}">${esc(h.kicker)}</div>
    <div style="${t(28, p.ink, 'font-weight:800;letter-spacing:-0.5px;line-height:1.2;padding-top:6px;')}">${esc(h.title)}</div>
    <div style="${t(14, p.muted, 'padding-top:4px;')}">${esc(h.sub)}</div></td></tr>`;
}
/** The pill + one-line headline, like the Friday report's "The call". */
export function callCard(p: Palette, label: string, pill: string, headline: string, alert = false) {
  const bg = alert ? RED : p.accent, fg = alert ? '#FFFFFF' : p.onAccent;
  return card(p, `${kicker(p, label)}${table(`<tr><td align="center" style="background:${bg};padding:8px 18px;border-radius:999px;"><span style="${t(20, fg, 'font-weight:800;letter-spacing:1px;')}">${esc(pill)}</span></td></tr>`, true)}
    <div style="${t(17, p.ink, 'font-weight:600;line-height:1.45;padding-top:14px;')}">${esc(headline)}</div>`);
}
/** Up to five round badges, like "Day by day". */
export function statsCard(p: Palette, label: string, stats: Stat[]) {
  const w = Math.floor(100 / stats.length);
  const cells = stats.map((s) => {
    const edge = s.alert ? RED : p.accent, bg = s.filled ? edge : '#FFFFFF', fg = s.filled ? (s.alert ? '#FFFFFF' : p.onAccent) : s.alert ? RED : p.ink;
    const size = s.value.length > 4 ? 13 : s.value.length > 2 ? 16 : 20;
    return `<td align="center" width="${w}%" style="padding:0 2px;vertical-align:top;">${table(`<tr><td align="center" width="56" height="56" style="width:56px;height:56px;border-radius:30px;border:2px solid ${edge};background:${bg};${t(size, fg, 'font-weight:800;line-height:56px;')}">${esc(s.value)}</td></tr>`, true)}
      <div style="${t(12, p.ink, 'font-weight:700;padding-top:6px;line-height:1.3;')}">${esc(s.label)}</div></td>`;
  }).join('');
  return card(p, `${kicker(p, label)}${table(`<tr>${cells}</tr>`)}`);
}
/** Subject rows with a right-hand date/age pill; alert rows go red. */
export function rowsCard(p: Palette, label: string, rows: Row[], note = '') {
  const body = rows.map((r, i) => `<tr><td style="padding:12px 0;vertical-align:middle;${i ? `border-top:1px solid ${p.line};` : ''}">
      <div style="${t(15, p.ink, 'font-weight:700;line-height:1.3;')}">${esc(r.title)}</div>${r.detail ? `<div style="${t(13, p.muted, 'padding-top:2px;line-height:1.4;')}">${esc(r.detail)}</div>` : ''}</td>
    <td align="right" style="padding:12px 0 12px 10px;vertical-align:middle;${i ? `border-top:1px solid ${p.line};` : ''}">${table(`<tr><td style="background:${r.alert ? '#FBEDEA' : p.soft};padding:4px 10px;border-radius:999px;${t(12, r.alert ? RED : p.ink, 'font-weight:800;white-space:nowrap;')}">${esc(r.pill)}</td></tr>`, true)}</td></tr>`).join('');
  return card(p, `${kicker(p, label)}${table(body)}${note ? `<div style="${t(12, p.muted, 'padding-top:10px;line-height:1.5;')}">${note}</div>` : ''}`);
}
export function quoteCard(p: Palette, label: string, quote: string, context = '') {
  return card(p, `${kicker(p, label)}${context ? `<div style="${t(13, p.muted, 'line-height:1.5;padding-bottom:8px;')}">${esc(context)}</div>` : ''}
    <div style="${t(16, p.ink, 'font-style:italic;line-height:1.55;padding:2px 0 2px 14px;')}border-left:4px solid ${p.accent};">&ldquo;${esc(quote)}&rdquo;</div>`);
}
/** Dark card with the one thing to do and a button, like "Note to Taylan". */
export function actionCard(p: Palette, label: string, text: string, button?: { label: string; url: string }) {
  const btn = button ? `<div style="padding-top:16px;">${table(`<tr><td style="background:${p.accent};border-radius:999px;padding:12px 22px;"><a href="${esc(button.url)}" style="${t(15, p.onAccent, 'font-weight:800;text-decoration:none;')}">${esc(button.label)} &rarr;</a></td></tr>`, true)}</div>` : '';
  return `<tr><td style="padding:0 16px 14px 16px;">${table(`<tr><td style="background:${p.ink};padding:20px;border-radius:16px;">
    <div style="${t(11, p.soft, 'font-weight:700;letter-spacing:1.5px;text-transform:uppercase;')}">${esc(label)}</div>
    <div style="${t(15, '#FFFFFF', 'line-height:1.55;padding-top:8px;')}">${esc(text)}</div>${btn}</td></tr>`)}</td></tr>`;
}
export function email(p: Palette, h: Header, cards: string[], footer: string) {
  const min = (s: string) => s.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ');
  return min(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:${p.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${p.page}" style="width:100%;background-color:${p.page};"><tr><td align="center" style="padding:20px 0;font-family:${FONT};">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
${header(p, h)}${cards.join('')}
<tr><td style="padding:6px 24px 28px 24px;"><div style="${t(11, p.muted, 'line-height:1.6;')}">${esc(footer)}</div></td></tr>
</table></td></tr></table></body></html>`);
}
