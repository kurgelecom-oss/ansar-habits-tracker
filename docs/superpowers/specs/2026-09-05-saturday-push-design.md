# Saturday Push, weekday wallet switch, Sunday off — design (5 Sep 2026)

Decided with tk in chat, 5 Sep 2026. This file is the written record.

## The three rules

1. **The week decides IF.** Mon–Fri points → tier. Bench (34/55) or better unlocks
   Saturday PS5. Below that, no PS5 that weekend. Saturday can never buy back a week.
2. **Saturday decides WHEN.** PS5 starts only after all three Saturday Push rows are
   parent-PIN verified. Push happens whether or not the week unlocked PS5.
3. **Sunday does not exist.** Nothing to view, nothing to tick. The server refuses
   ticks and the board renders one rest card. Notion Days drop Sun on every habit
   AND the code hard-stops Sunday, so a Notion edit cannot bring it back.

## Stretch Wallet (Mon–Fri only)

Nobody tracks minutes. The wallet is an all-or-nothing daily switch:
4 items done = "1h 15m PS5 today". No balance, no bank, no Spend, no caps, no
weekend bonus, no "Weekend Redemption Only" setting. Same unlock gate as before
(Qur'an → Morning → Homeschool). Hidden on Saturday. `stretch_completions` stays as
the completion record; `minutes` is written as 0 and read by nothing.

## Saturday Push block

Notion Block "Saturday Push" → local `saturday_push`. Three rows, Days = Sat,
window 09:00–17:00, Point Type `perfect_day_only`, all parent-PIN:

| id | name | Target (Notion text, editable weekly) |
|---|---|---|
| push_engine | Engine | 2 km continuous run, no walking |
| push_strength | Strength & skill | 3 rounds: 10 push-ups, 30s plank, 50 juggles |
| push_quran | Qur'an memorisation | 5 new ayat from memory + week's revision |

Zero FC points. Saturday points never enter the /55 (SQUAD_DAYS filter). The reward
is the PS5 start and the Saturday streak shown on the board.

New Notion property on table 4: `Target` (rich text). Read by lib/notion.ts, shown as
the row's guidance line. The ladder is edited in Notion; no deploy.

## Board on Saturday

1. Morning Habits (unchanged; Qur'an minimum still gates).
2. Today's Programme: 🔥 Saturday Push (first), then Afternoon / Evening minus BTN
   and journal.
3. Work + Week (unchanged; shows the week's final tier).
4. PS5 panel replaces the wallet: week tier + unlock verdict, Push n/3, Saturdays in
   a row.

## Other changes

- BTN (`btn_cornell`) Days → Mon–Fri. Scoring untouched (scoring.ts is mirrored and frozen).
- family-dashboard `BLOCK_MAP` gains "Saturday Push" so those rows never fall into its
  Morning block.
- Day toggle reads "Weekday / Saturday".

## Deploy order

Code → deploy → verify `/api/tick` carries `restDay` and `target` → Notion edits.
