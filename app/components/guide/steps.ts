/* ════════════════════════════════════════════════════════════════════════════
   THE GUIDE — what every area of Ansar OS is, written down.

   One list of steps per screen. Each step points at something on the page and
   answers the same five questions in the same order:

     what       what this area is
     tracked    how the system records it
     measured   how it turns into a number or a state
     controlled who or what decides, and what can override it
     leadsTo    what it unlocks or feeds

   KEEP THIS BESIDE THE RULES IT DESCRIBES. Every number below is copied from
   lib/scoring.ts, lib/gating.ts, lib/weekend.ts or lib/streak.ts. When one of
   those changes, change the sentence here in the same commit — a guide that is
   confidently out of date is worse than no guide.

   Written to be read by a 17-year-old: plain words, short sentences, and the
   real numbers rather than "some points".
   ══════════════════════════════════════════════════════════════════════════ */

export type GuideStep = {
  /** CSS selector for the area to light up. A step whose target is not on the
   *  page (a rest day, a locked room) still shows, without the spotlight. */
  target: string;
  title: string;
  what: string;
  tracked: string;
  measured: string;
  controlled: string;
  leadsTo: string;
};

const NAV = 'nav[aria-label="ANSAR FC sections"]';

const TODAY: GuideStep[] = [
  {
    target: NAV,
    title: "The menu and the status line",
    what: "This bar is on every screen. On the left are the places you can go. On the right is today at a glance: the share of today's habits done, the day streak, and the Sydney clock.",
    tracked: "The clock comes from the server, not from the iPad. Changing the iPad's time changes nothing, because every rule checks the server's clock.",
    measured: "\"Today\" is habits done divided by habits scheduled today. The streak counts weekdays in a row with at least 5 habits done. Weekends neither add to it nor break it.",
    controlled: "Nobody sets these by hand. They are worked out from the ticks. The green \"Live\" dot means the board can reach the server; if it says Offline, taps will not save.",
    leadsTo: "The streak and the percentage are for motivation only. Points and rewards come from the panels further down.",
  },
  {
    target: '[class*="matchCentre__"]',
    title: "Real Madrid's next match",
    what: "The next Real Madrid fixture, or the live score while a match is on. It sits at the top as a reminder of what the work is for.",
    tracked: "It comes from a live football data service. If that service is down, the bar says so instead of showing a made-up match.",
    measured: "Nothing here is scored. It is not connected to points, habits or rewards.",
    controlled: "Nobody in the house controls it. It updates by itself.",
    leadsTo: "The Leaderboards screen shows the full league tables this fixture belongs to.",
  },
  {
    target: '[data-testid="today-pillars"] > section:first-child',
    title: "School: today's blocks",
    what: "A summary of today's school day. It shows how many learning blocks are done and the next two tasks, with the real task written out.",
    tracked: "The blocks come from the Daily Programme in Notion. The app keeps its own copy and refreshes it every night, so a change made in Notion today shows up tomorrow. Each block is ticked on the School screen, and each tick is saved against that exact block.",
    measured: "Blocks done out of blocks planned for today. On a weekend it shows the next school day instead of a zero.",
    controlled: "A parent writes the week in Notion. Ansar ticks each block when it is finished. This card only reports; you cannot tick from here.",
    leadsTo: "Ticking blocks builds the school record. The 5 daily points still come from the \"Homeschool session completed\" habit in Today's Programme, not from this card.",
  },
  {
    target: '[data-testid="today-pillars"] > section:last-child',
    title: "Football: today's sessions",
    what: "A summary of today's football. It shows how many sessions are done and the next two, with their times.",
    tracked: "Sessions come from a fixed weekly plan built around the school day. They are ticked on the Football screen. If the football database is not switched on, ticks are kept on this device only, and the Football screen says so.",
    measured: "Sessions done out of sessions planned today. The line at the bottom is the planned football load for the week against a cap of 12 hours, which is one hour per year of age. It is the plan, not hours actually played.",
    controlled: "The plan is set in the app. Ansar ticks what he really did. Mum sets one focus for the week at the Sunday meeting.",
    leadsTo: "Football ticks do not earn habit points, except \"Soccer training attended\" on Mondays and Wednesdays, which is a habit worth 1 point.",
  },
  {
    target: 'section[aria-label="Morning Habits"]',
    title: "Morning Habits",
    what: "The seven things that start the day, from making the bed to writing the day's goals. They have to be done between 6:30am and 8:30am.",
    tracked: "Each tap is sent to the server, which checks four rules before saving it. One: the time must be inside the window. Two: the habits must be done in order, top to bottom. Three: there must be at least 90 seconds between taps, so the list cannot be swept in one go. Four: the date must be today.",
    measured: "All seven done earns 2 points. Six done earns 0. It is all or nothing on purpose.",
    controlled: "The server decides, not the screen. If a habit was really done but the tap was missed, a parent can hold the row for two seconds and enter the parent PIN. That is saved as an override and the row is marked, so it never looks like an ordinary tick.",
    leadsTo: "Finishing this block unlocks the Homeschool session and, later, the Stretch Wallet. If it is not finished, both stay locked.",
  },
  {
    target: "section[aria-label=\"Today's Programme\"]",
    title: "Today's Programme",
    what: "Everything else the day asks for: the homeschool session, the afternoon and evening habits, and soccer training on Mondays and Wednesdays. On a Saturday it shows the Saturday Push instead of homeschool.",
    tracked: "The same four server rules apply. Each habit has its own time window, shown on the row. The BTN habit also needs a parent to enter the PIN, which confirms a parent has seen the Cornell notes. The journal row checks for a real journal entry submitted through the form.",
    measured: "Homeschool session: 5 points. BTN and notes: 1 point. All five prayers: 1 point. Soccer training: 1 point on training days. The other habits earn no points on their own, but every scheduled habit must be done for a Perfect Day, which adds 1 bonus point. The most a day can score is 10, or 11 on a training day.",
    controlled: "The habit list, windows and order are set by a parent in Notion. The server enforces them. A parent override works here the same way as in the morning.",
    leadsTo: "These points make up most of the week's total, which decides the weekend.",
  },
  {
    target: 'section[aria-label="Work + Week"]',
    title: "Work + Week",
    what: "The week's scoreboard, plus the button for logging finished work.",
    tracked: "\"Log Work\" opens a form where a piece of finished work is recorded. The week total adds up the daily points from Monday to Friday.",
    measured: "The week is out of 55. That is 52 from five perfect days plus a 3-point bonus for getting all five. The tiers are: First Team at 42 or more, Bench at 34 to 41, Reserves at 26 to 33, and Training Ground below 26. \"Match Readiness\" is a quick picture of today's learning and does not affect points.",
    controlled: "Nobody can type a score in. It only moves when habits are ticked or a parent override is recorded.",
    leadsTo: "Reaching Bench (34 points) or better by Friday unlocks PS5 on Saturday. Below that there is no PS5 that weekend, and nothing done on Saturday can buy it back.",
  },
  {
    target: 'section[aria-label="Stretch Wallet"], section[aria-label="Saturday"]',
    title: "Stretch Wallet (weekdays) or Saturday",
    what: "On weekdays this is the Stretch Wallet: four extra challenges. On a Saturday it is replaced by the Saturday card, which shows whether PS5 is unlocked.",
    tracked: "Each stretch item is ticked here and saved for today only. The wallet stays locked until the Qur'an recitation, the whole Morning Habits block and the Homeschool session are done.",
    measured: "All four items done earns 1 hour 15 minutes of PS5 that same day. Three out of four earns nothing. Nothing is banked or carried to another day.",
    controlled: "The four items are set by a parent in Notion. On Saturday, PS5 needs two things: the week reached Bench or better, and every Saturday Push task has been signed off by a parent.",
    leadsTo: "Same-day PS5 on weekdays. On Saturday, the controller comes out only when both Saturday rules are met.",
  },
];

const SCHOOL: GuideStep[] = [
  {
    target: '[class*="school_tabs__"]',
    title: "The three views of school",
    what: "School has its own screen with three views: Today, This week and The year.",
    tracked: "All three read the app's stored copy of the Daily Programme from Notion. The copy refreshes every night.",
    measured: "The line under the title counts blocks done out of blocks planned for the whole week.",
    controlled: "A parent builds each week in Notion. Nothing on this screen can change the plan; it can only record what was done.",
    leadsTo: "This is the school record. It is what a monthly report or a registration review would draw on.",
  },
  {
    target: '[class*="school_card__"]',
    title: "Today's blocks",
    what: "Each block of the school day, with the actual task written on the row and the subject's standing guide under it.",
    tracked: "Tap the square on a block when it is finished. The tick is saved against that exact row in the programme, with today's date. A block can be ticked once and cannot be un-ticked from here.",
    measured: "Blocks done out of blocks today. The week view shows the same ticks across Monday to Friday.",
    controlled: "Ansar ticks. The server checks each tick before saving it. If a task is unclear, it has to be fixed in Notion by a parent, not here.",
    leadsTo: "The Today board's School card reads these ticks. The Friday review and monthly exam are written from the same programme rows.",
  },
  {
    target: NAV,
    title: "What is not built yet",
    what: "The year view shows where this week sits in a ten-week term. Year level, curriculum goals and subject mastery are not recorded in the system yet.",
    tracked: "The term position is read from the week's title, for example \"Term 4, Week 1\". It is text, not a real setting, so a badly named week cannot be placed.",
    measured: "Nothing on the year view is scored.",
    controlled: "A parent names the week in Notion.",
    leadsTo: "A later stage adds year goals and a mastery map. Until then this screen says plainly what is missing rather than inventing it.",
  },
];

const FOOTBALL: GuideStep[] = [
  {
    target: '[class*="pathway_subnav__"]',
    title: "The football sections",
    what: "Football has its own set of screens: today's plan, matches, drills, fitness, conditioning, strength, food, screens, what scouts look for, the season and players to study.",
    tracked: "Most of these are reference pages. Only three record anything: today's checklist, personal bests in Scout's Eye, and the match log in Matches.",
    measured: "Each page that records something explains its own measure. The reference pages are not scored.",
    controlled: "The content is set in the app. It changes when the plan is rewritten, not day to day.",
    leadsTo: "Everything here supports one thing: turning up to training and matches prepared.",
  },
  {
    target: '[class*="pathway_hero__"]',
    title: "Today's theme and score",
    what: "The day's football theme, a one-line instruction, and a scoreboard showing how much of today's checklist is done.",
    tracked: "The scoreboard counts ticks from the checklist lower on this page.",
    measured: "Items done out of items on today's checklist, shown like a match score and as a percentage.",
    controlled: "The theme for each weekday is fixed in the weekly plan. The pills show the next session, the treat window if there is one, and lights-out time.",
    leadsTo: "A full checklist is a \"perfect day\" for football. It does not add habit points.",
  },
  {
    target: 'section[aria-labelledby="plan-h"]',
    title: "Today's plan",
    what: "The day's sessions in time order, with what to do in each. On school days a band marks 8:30am to 1:30pm as homeschool. Football never takes time from it.",
    tracked: "This is a timetable, not a tick list. The session coming up next is outlined.",
    measured: "Session lengths add up to the weekly load. The cap is 12 hours a week, one hour per year of age, which is a common guideline for young athletes.",
    controlled: "Times are set in the app. Club training times are the club's.",
    leadsTo: "Each session links to its drills.",
  },
  {
    target: 'section[aria-labelledby="check-h"]',
    title: "Today's checklist",
    what: "The sessions plus the daily basics: water, food, lights out, and one line about what got better.",
    tracked: "Tap an item to tick it and tap again to untick. The note under the list says where ticks are being saved: to the family record, or to this device only if the football database is not switched on.",
    measured: "Ticked items out of total items. There are no time windows and no order here, unlike the habits on the Today board.",
    controlled: "Ansar ticks honestly. The heading says it: tick it when it's real.",
    leadsTo: "The Today board's Football card reads the session ticks from here.",
  },
  {
    target: '[class*="pathway_weekStrip__"]',
    title: "The week and the load cap",
    what: "Seven days, each with its theme. Tap a day to see its sessions and what to eat around them.",
    tracked: "Nothing is recorded by tapping a day. It is a look ahead.",
    measured: "The line above shows planned football hours against the 12-hour cap.",
    controlled: "Fixed in the weekly plan. Friday is the light day and Sunday is match day.",
    leadsTo: "Mum's weekly focus, set at the Sunday meeting, sits in the card above this strip.",
  },
];

/** One step for each football sub-screen: what the page is for and whether it records anything. */
function footballPage(title: string, what: string, tracked: string, measured: string, leadsTo: string): GuideStep[] {
  return [{
    target: '[class*="pathway_content__"]', title, what, tracked, measured,
    controlled: "The content is written into the app. A parent or coach changes it by asking for the plan to be updated.",
    leadsTo,
  }];
}

const PROGRESS: GuideStep[] = [
  {
    target: '[class*="progress_metrics__"]',
    title: "The three headline numbers",
    what: "The completion rate over the last 12 weeks, the number of habits completed, and the best single day.",
    tracked: "All three are worked out from saved habit ticks. Parent overrides count as completed, because the habit was done.",
    measured: "Completion rate is habits done divided by habits planned for those days. The plan for each day comes from the habit list, so a Saturday is measured against Saturday's shorter list.",
    controlled: "Nobody can edit these. They change only when ticks are saved.",
    leadsTo: "This screen covers habits only. School blocks and football sessions are not in these numbers yet.",
  },
  {
    target: '[class*="progress_chart__"]',
    title: "This week, day by day",
    what: "One bar for each day, showing the share of that day's planned habits that were completed.",
    tracked: "From the same saved ticks. The buttons above the chart switch between the overview and a single past week.",
    measured: "A full bar is every scheduled habit done that day.",
    controlled: "Read-only.",
    leadsTo: "A run of short bars on the same weekday usually points at a time window that does not fit the day.",
  },
  {
    target: '[class*="progress_breakdown__"]',
    title: "The compounding record",
    what: "Each past week as one tile, so months of effort can be seen at once.",
    tracked: "One tile per week, built from that week's ticks.",
    measured: "The same completion rate, per week.",
    controlled: "Read-only.",
    leadsTo: "Tap a week to open its day-by-day chart above.",
  },
];

const TARGETS: GuideStep[] = [
  {
    target: '[class*="targets_hero__"]',
    title: "The target map",
    what: "Eight areas Ansar is building, from football to Qur'an to chess. Each has a long-term goal, a current focus and a next thing to prove.",
    tracked: "This screen is written text. It is not connected to the habit, school or football records yet, so nothing here updates by itself.",
    measured: "Nothing on this screen is scored or counted.",
    controlled: "A parent sets the goals. Changing them means editing the app.",
    leadsTo: "Only the Football area opens a working section. The other seven are descriptions for now. A later stage either connects this map to real records or removes it.",
  },
];

const TESTS: GuideStep[] = [
  {
    target: '[class*="tests_unlock__"], [class*="tests_room__"]',
    title: "The assessment room",
    what: "Two kinds of check on learning live here. The Friday review asks about the week's actual work. The monthly exam tests each subject at the end of the month.",
    tracked: "A parent unlocks this device once with the parent PIN, and it stays unlocked for 30 days. Answers save as they are typed and are kept exactly as first written. A correction is stored beside the original, never over it.",
    measured: "The Friday review picks up to two days for each subject and asks what the task was, what he did and what he got, plus one question about what is still unclear. A parent marks each answer from 0 to 2. A monthly exam is twelve questions a subject: eight multiple choice and four yes or no. The system marks it the moment it is handed in.",
    controlled: "Questions are written from the dated lessons in the Daily Programme. A parent must preview and approve an exam before it can be sat, and approving it freezes it. The server enforces the time limit, and an exam cannot be handed in faster than 15 seconds a question.",
    leadsTo: "The learning record at the bottom of this screen. Scores are for finding gaps. They do not add or remove points.",
  },
  {
    target: '[class*="tests_stats__"]',
    title: "Papers lock the board until they are handed in",
    what: "A review or exam that is due is part of the day, not an extra. Until it is handed in, the board does not move on.",
    tracked: "The server checks for a due paper before it records any tick. Morning Habits are always open. The Homeschool session, the afternoon and evening habits, school blocks, the Stretch Wallet and the league tables are locked.",
    measured: "A Friday review is due on its Friday and stays due until it is done, including over the weekend. Monthly exams are due in the last week of the month, spread over the school days left: with eight subjects that is two a day, then one a day.",
    controlled: "Only handing the paper in lifts the lock. A parent's marking is not needed for that. A parent can lift the lock for one day with the parent PIN, from the card on the Today board. An exam a parent has not approved yet does not lock anything, and if the papers cannot be loaded the board stays open.",
    leadsTo: "The week's and the month's learning gets checked every time, instead of only when someone remembers.",
  },
];

const LEADERBOARDS: GuideStep[] = [
  {
    target: '[class*="leaderboards_board__"], [class*="leaderboards_content__"]',
    title: "The league tables",
    what: "La Liga, the Champions League, the Premier League and Serie A, one at a time. Real Madrid's row is marked in the two it plays in.",
    tracked: "From the same live football data service as the match bar on Today. If the service has no data for a view, the screen says so.",
    measured: "Standard league columns: matches played, wins, draws, losses, goals for and against, goal difference and points.",
    controlled: "The tables are the real competition. When you can see them is a house rule: on a school day this screen is locked until the Homeschool session is ticked, and it is open all day on Saturday and Sunday. The server enforces that, so reloading does not get around it.",
    leadsTo: "Nothing else in Ansar OS. It is here because following a team closely is part of learning the game, and it comes after the work.",
  },
];

export const GUIDES: Record<string, GuideStep[]> = {
  "/": TODAY,
  "/school": SCHOOL,
  "/pathway": FOOTBALL,
  "/pathway/matches": footballPage("Matches", "Ansar's own club fixtures and results, the ladder, and a log to fill in after each game.", "The match log saves minutes played, goals, assists, a self-rating and one thing learned, one entry per match day.", "Results build a win, draw, loss record. The log builds his own numbers over the season.", "The Sunday meeting with Mum uses the log to pick next week's one focus."),
  "/pathway/drills": footballPage("Drills", "Sixteen drills with moving pitch diagrams, each with what to do and what to count.", "Nothing is recorded on this page. Drills are done as part of a session, and the session is ticked on the football Today screen.", "Each drill names something to count, such as clean first touches out of 50, so progress can be felt week to week.", "The daily plan links straight to the drill it needs."),
  "/pathway/fitness": footballPage("Fitness", "Speed, agility and movement work that is right for his age.", "Reference only. Nothing is ticked here.", "Not scored on this page. Timed tests live in Scout's Eye.", "Sessions in the weekly plan draw from this page."),
  "/pathway/conditioning": footballPage("Conditioning", "Building the engine for the last ten minutes of a match.", "Reference only. Nothing is ticked here.", "Not scored on this page.", "The plan schedules this work so the weekly load stays under 12 hours."),
  "/pathway/strength": footballPage("Strength", "Bodyweight strength first. Weights come later and have to be earned.", "Reference only. Mum signs off the test results that unlock level 2.", "Levels, not points. A level is passed by meeting its bodyweight standard with good form.", "Level 2 strength, and fewer injuries."),
  "/pathway/fuel": footballPage("Fuel", "What to eat and drink around training and matches, and when the treat windows are.", "The daily checklist has two food items: two full water bottles, and every meal with a protein and a colour.", "Ticked or not ticked each day. There is no calorie counting.", "Mum opens and closes the treat windows."),
  "/pathway/screens": footballPage("Screens", "What is worth watching and what is not, for a footballer.", "Reference only. Screen time limits themselves are a house rule, not tracked on this page.", "Not scored.", "Film study days in the weekly plan."),
  "/pathway/scouts": footballPage("Scout's Eye", "What coaches and scouts look for, and the physical and technical tests that show it.", "Each test result can be entered. The app keeps the best one as a personal best, with its date.", "Each test says whether higher or lower is better. A new result replaces the personal best only if it beats it.", "Personal bests are the proof of improvement over a season."),
  "/pathway/season": footballPage("Season", "The football year: its phases, the focus for each month, and a marker for where we are now.", "Nothing is entered here. The marker moves with the calendar.", "Not scored.", "Each month's focus sets the signature drill shown on the football Today screen."),
  "/pathway/players": footballPage("Players", "Six top players to study, changed every Monday.", "The list updates by itself each week.", "Not scored.", "Something specific to watch for and copy in training."),
  "/pathway/legends": footballPage("Legends", "Players from the past worth knowing, and what made each one great.", "Reference only.", "Not scored.", "Ideas to try in training."),
  "/progress": PROGRESS,
  "/targets": TARGETS,
  "/tests": TESTS,
  "/tests/practice": TESTS,
  "/leaderboards": LEADERBOARDS,
};

/** "/pathway/drills/" and "/pathway/drills" are the same screen. */
export function guideFor(pathname: string | null): GuideStep[] {
  if (!pathname) return [];
  const key = pathname.replace(/\/+$/, "") || "/";
  return GUIDES[key] ?? [];
}
