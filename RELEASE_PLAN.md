# Ball Knowledge — Release Plan: 38 Improvements

A deep audit of the codebase (release readiness, UX/UI, progression/retention
wiring, and content depth) produced this prioritized list. Each item is grounded
in a concrete finding with file evidence. Tiers are ordered by impact-per-effort
for getting to "best game in existence" quality.

---

## Tier 1 — Ship blockers & first impressions

1. **Wire up inline answer feedback (green/red buttons).** `AnswerOption.tsx`
   defines `correct` (green ring) and `incorrect` (red shake) visual states, but
   `QuestionCard.tsx` only ever passes `idle | selected | muted` — the most basic
   quiz affordance is coded but dead. Players currently have to read the separate
   ResultReveal card to learn what happened. One of the highest feel-per-line
   fixes in the whole codebase.

2. **Add a share preview image (`og:image` + `twitter:image`).** `index.html` has
   og/twitter text tags but no image, and `twitter:card` is the small `summary`
   variant. Every "beat my score" link — the game's core viral loop — renders as
   a bare text link. Generate a branded 1200×630 card, switch to
   `summary_large_image`.

3. **Build the Weekly Season (retention Phase 3).** `lib/season.ts` does not
   exist — it's the planned capstone: cross-mode weekly points, tiers
   (e.g. Sunday League → World Class), weekly reset. This is the single system
   that makes every mode matter every week and fixes the "daily loop is done in
   5 minutes" problem.

4. **Wire the 7 orphaned modes into progression.** Survival/Time Attack/Gauntlet,
   Connections, Daily Connections, Older or Younger?, Career Path, Managers, and
   Mystery Duel each store only an isolated `bk_*` local best. None advance
   profileStats, quests, feats, achievements, or cosmetics — they're progression
   dead-ends. Route their results through a shared recording layer.

5. **Sync all progression to the cloud, not 3 blobs.** `progress.ts` syncs only
   `bk_career_v1`, `bk_profile_v1`, `bk_daily_v1`. Achievements, feats, cosmetics,
   club identity, all solo-mode bests, and the Daily Connections streak are
   silently lost on a new device — even though `backup.ts` already proves the app
   knows these keys matter (it exports 13 of them).

6. **Give quests a payout.** `quests.ts` computes `completedQuestCount` but no
   reward is wired to completion — quests are a checklist with zero payoff.
   Attach season points (item 3), cosmetic progress, or a streak-shield currency.

7. **Add a global player level ("Manager Grade").** No XP/level/rank exists
   anywhere — only per-mode bests and a Career-only derived reputation. One
   number that grows from *everything* you do (matches, solos, dailies, quests)
   is the spine every great game has.

8. **Expand onboarding beyond the 1v1 loop.** The 3-step intro covers quick match
   + career only; the eight-tile modes grid (Connections, Mystery, Cup, Arcade…)
   gets zero introduction, and there's no practice question. Add a "your first
   match" guided flow and a one-line hook per mode tile on first visit.

9. **Add sound to Mystery Duel + universal tap feedback.** The flagship versus
   mode imports no sound at all — locking a secret, answering, winning a round:
   all silent. Beyond that, the `click` sound only fires on match answers; menus
   and mode navigation are silent even with sound on.

10. **Reinstate the PWA.** `public/sw.js` is a self-destroying service worker and
    `index.html` actively unregisters SWs — a deliberate teardown that left no
    manifest, no install prompt, no offline. The game already works fully offline
    vs CPU; it deserves installability (vite-plugin-pwa + manifest + icons).

## Tier 2 — Game feel & depth

11. **Give the CPU personality.** `botPlayer.ts` is 79 lines: flat accuracy by
    difficulty, no names, no styles, no adaptation. Career already invents rival
    personalities (`careerProgression.ts`) but they never reach bot behaviour.
    Named bots with subject strengths/weaknesses (a "transfer-market nerd" who
    aces fees but misses history), visible pre-match scouting reports, and
    varied think-time under pressure.

12. **Career endgame / prestige loop.** Winning the Premier League sets
    `career_complete` and the mode simply ends. Add continued title defenses,
    a "legacy" NG+ (restart in League Two with a legacy star + harder sim), or
    European nights as post-title content.

13. **More + procedural Cup Runs.** Only 3 hardcoded brackets with identical
    opponents every run. Add a seeded weekly cup (fresh bracket every Monday,
    ties into Weekly Season) and themed rotations (Der Klassiker Run, South
    American Route).

14. **Expand achievements (20 → 50+).** Zero badges exist for any solo mode, for
    Connections, Cups (winning one!), or Career milestones (promotion, division
    titles) despite all the data being stored. Add rarity tiers (bronze/silver/
    gold/platinum) so the Trophy Cabinet feels like a cabinet.

15. **Expand cosmetics (12 earnable → 30+).** Half the current catalogue gates on
    the daily streak; a committed player exhausts it in a month. Add unlocks from
    solo/connections/cup/mystery feats, goal-celebration animations, badge
    frames, crest shapes, and a rare tier for the truly hard feats.

16. **Deepen the easy question pools.** The binding freshness constraint on
    Casual matches: odd_one_out×easy has **9** questions, transfer_fee×easy 9,
    spot_the_lie×easy 11, guess_the_number×easy 12. New players see repeats
    fastest — exactly the players you can't afford to bore. Target ≥25 per
    type×easy.

17. **Grow Connections (46 puzzles) + fix daily repeats.** Only 3 nightmare
    puzzles exist, and `dailyConnection()` picks `hash % 46` with no
    no-repeat-until-exhausted guard — dailies visibly recycle within weeks.
    Target 100+ puzzles and an exhaustion-aware picker.

18. **Grow the Daily Rival cast (16 names) into narrative arcs.** Rival names
    repeat every ~16 days. Expand the pool and give rivals persistent H2H records
    ("Third meeting with Jimmy Nets — you lead 2–0") so the daily reads as a
    rivalry, not a random name.

19. **Grow the player DB (299 → 450+).** Only 7 players have a 2020s debut —
    the newest generation (the one younger players know best) is the thinnest.
    Goalkeepers are underrepresented (21). This directly deepens Mystery Duel,
    Connections, Career Path, and Older or Younger simultaneously.

20. **Fold Connections into the 1v1 match as an 11th type.** Previously deferred
    pending sign-off; the matcher is now DB-backed and battle-tested. Needs a
    QuestionCard typed-input branch + host-side accept-list grading in
    `matchEngine.submitAnswer`.

21. **Ship a new mini-game from the backlog.** "Starting XI" (name N players from
    a famous lineup), "Top Scorer" (rank the tallies), or "Same Number" (players
    who shared a shirt number). The 10-type pipeline (types → scoring →
    distribution → picker → card) is proven.

22. **Deepen the quest pools.** The skill group has **2** possible quests and the
    daily group 2 — the trio combinations cycle within days. Add solo-mode quests
    ("reach 10 in Older or Younger"), mode-specific skill quests, and rotating
    "featured mode" quests that spotlight a different tile each day.

## Tier 3 — Social & viral surface

23. **Wordle-style share for the typed modes.** Connections, Daily Connections,
    Older or Younger, Career Path, and Managers have **no share button at all** —
    yet they're the most screenshot-shareable formats in the game. Emoji-grid
    results ("Ball Knowledge Daily #142 🟩🟩🟥🟩 streak 12") are the proven
    daily-game growth engine.

24. **Standardize every result screen: Replay + Share + Home.** No solo mode has
    all three today (SoloGame/Connections have share but no "play again";
    OY/CareerPath/Managers have replay but no share). One shared
    `ModeResultScreen` component fixes it everywhere.

25. **Make mode tiles live.** Six of eight home-grid tiles show static subtitles
    while the data for "Best: 14", "🔥 streak 6", or "Resume Cup Run —
    semi-final" already sits in localStorage. An in-progress Cup run is
    currently invisible from home.

26. **"Beat my score" challenge links for solo modes.** The Daily Rival already
    has them; extend the pattern (seeded identical run from a shared link) to
    Survival, Time Attack, and Older or Younger so a share is a playable dare,
    not just a boast.

## Tier 4 — UI, accessibility & polish

27. **Modal accessibility pass.** No modal in the app traps focus; Escape-to-close
    works in only ~4 of ~10 modals; most set no initial focus. Build one `Modal`
    primitive (using the orphaned `.surface` token — defined in globals.css,
    used by zero components) and migrate the ten hand-rolled `bg-ink-800` shells.

28. **Confirm destructive actions.** "Reset stats", "Abandon career", and "Clear
    all local data" fire on a single tap of near-invisible `text-white/25` text.
    A two-step confirm (or type-to-confirm for clear-all) is table stakes.

29. **Reconcile copy.** Hero says "Ten mini-games" while the lobby says "6
    mini-games mixed in"; the home tile says "Arcade" but the hub titles itself
    "Game Modes"; Mystery is branded three different ways. Pick one name per
    concept.

30. **Fix flow dead-ends.** `GamePage` returns `null` while `!room` (blank frame
    entering a match); the non-host on FinalResult can only "wait for host" or
    go Home — give guests a "leave & play again" path.

31. **Keyboard-navigable autocomplete.** The typed modes' suggestion lists use
    `role="listbox"` with hard-coded `aria-selected=false` and no arrow-key
    navigation — semantically misleading for screen readers. Add roving focus
    or drop the listbox roles.

32. **Mobile touch polish.** `viewport-fit=cover` is set but no
    `env(safe-area-inset-*)` padding exists anywhere (header sits under the
    notch); no `-webkit-tap-highlight-color` reset or `touch-action` tuning for
    rapid answer tapping.

## Tier 5 — Platform, ops & trust

33. **Add analytics + crash reporting.** Zero instrumentation exists — no
    visibility into DAU, mode popularity, share conversion, or crashes.
    ErrorBoundary and GameProvider already have the catch points; a lightweight
    privacy-friendly layer (e.g. Plausible/PostHog + Sentry) closes the loop.

34. **App icons.** SVG favicon only — no PNG fallback, no 180×180
    `apple-touch-icon`, no `apple-mobile-web-app-*` tags. iOS "Add to Home
    Screen" currently gets a screenshot.

35. **Distinguish "invalid key" from "network lost".** An invalid Ably key
    constructs a client fine, then fails at connect — surfacing as the generic
    "Connection lost. Check your network and rejoin." Detect auth-class failures
    and message them (and fall back to local) explicitly.

36. **Trim the font bill.** Three families × nine weights load render-blocking on
    the critical path — the single biggest first-paint cost now that JS is
    code-split. Subset/preload, or drop to two families and fewer weights.

37. **Device-test the built-but-dark online layer.** Mystery online 1v1,
    Firebase friends/leaderboards/leagues, and the Supabase path are all built
    but never verified on two real devices — the largest shipped-but-unproven
    surface in the game. (Owner-side Firebase console steps in
    `FIREBASE_SETUP.md` are the prerequisite.)

38. **Ops hygiene.** Rename the "Deploy preview" workflow (it's the production
    deploy), add `manualChunks` vendor splitting to the bare `vite.config.ts`,
    and consider an ESLint gate (`lint` is currently just `tsc --noEmit`).

---

## Suggested build order

- **Sprint 1 (feel + virality):** 1, 2, 9, 23, 24, 25, 29 — small, high-visibility.
- **Sprint 2 (the spine):** 3, 4, 6, 7, 5 — Weekly Season + unified progression + full sync. This is the transformation.
- **Sprint 3 (depth):** 11, 14, 15, 16, 17, 18, 22 — content + chase.
- **Sprint 4 (release hardening):** 8, 10, 27, 28, 32, 33, 34 — onboarding, PWA, a11y, telemetry.
- **Then:** 12, 13, 19, 20, 21, 26, 30, 31, 35, 36, 37, 38.
