# Friday report renderer

`render.mjs` turns the Friday routine's analysis (`report.json`) into the email: email-safe HTML, a plain-text body and one ring PNG. The Friday 6pm Cowork routine fetches it from GitHub raw (`main`), so keep it dependency-free.

```
node render.mjs report.json outdir   # writes report.html, report.txt, ring.png, ring.b64.txt; exit 1 = self-check failed
node render.mjs fixture.json /tmp/x  # smoke check (synthetic data only, this repo is public)
```

Every style is inline: the Gmail MCP strips class attributes (and with them any <style> block) on send. The self-check fails above 35KB: the routine pastes the whole email into one send_message call, and a ~90KB payload hit the output-token cap on 23 Oct 2026.

Send with the Gmail MCP: `htmlBody` = report.html, `body` = report.txt, `attachments: [{content: <ring.b64.txt>, filename: "ring.png", mimeType: "image/png", inline: true}]`. The HTML points at `cid:att0`, which the Gmail MCP maps to attachment 0. External image URLs, SVG and data URIs are stripped by that tool, which is why the wheel is an inline PNG and everything else is tables.

The 7:30pm week-film routine reads this email from Gmail. The plain-text body carries every number and section, so keep it complete.

## report.json

| Field | Shape |
| --- | --- |
| `student` | `"Ansar"` |
| `week` | `{number, range, term}` |
| `verdict` | `{call: GREEN \| PROVISIONAL GREEN \| YELLOW \| RED, headline, strict?: {call, why}, detail?: [para]}`; `strict` = the call after discounting doubtful evidence, only when it differs |
| `days` | 5 × `{label, status: full \| caveat \| partial \| none \| flex, blocks?, logs?, note?}`; `caveat` = full but resting on backfilled/doubtful logs |
| `rings` | exactly 4 × `{label, n, d, value, note?}`, in order: full days, same-day logs, areas touched, evidence |
| `blocks` | `{days: [Mon..Thu], rows: 4 × {label, cells: done \| backfilled \| off_plan \| missing \| flex}}` |
| `areas` | exactly 8 VRQA areas × `{name, count, prior?, why?}`; `why` required when count is 0 |
| `strengths`, `weaknesses` | 3–5 × `{title, detail}`; title is one short sentence with the finding |
| `words` | `{theme, days, quote}`; quote is verbatim |
| `journals` | `{this_week, prior}` |
| `actions` | exactly 3 × `{title, detail, owner, when}` |
| `last_actions` | optional, last week's 3 actions × `{title, status: done \| partly \| not_done}` |
| `note_to_taylan` | optional, paragraphs |
| `flags` | `{notion: [{title, detail}], found: [{title, detail}]}` |
| `sources` | `{summary, cross_check, not_recorded?}` |
| `generated_at` | string, Australia/Melbourne |

Palette: #FAFBF2 page, #FFFFFF card, #E4EAD6 line/track, #16250E ink, #6C7A5E muted, #5BA524 green, #FFB200 amber, plus one alert red #C8442F used only for RED and zero areas.
