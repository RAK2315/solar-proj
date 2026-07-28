# Grilling Checklist - what to extract before architecting

Interview the user (via the `grill-me` skill, one question at a time) until these are answered. Skip anything the conversation already settled. Each item is here because getting it wrong sends the whole plan the wrong direction.

## Must-have (don't architect without these)

1. **The exact problem** - what specifically are you building, in one or two sentences? Not the theme, the *thing*. ("A tool that X for Y so that Z.")
2. **Time window** - how long is the hackathon? (24h / 36h / 48h / a week). This sets how aggressive the MVP cut must be.
3. **Team** - how many people, and what is each strong at (frontend / ML / backend / design)? Solo vs team of 4 changes the whole build order.
4. **Hard constraints** - anything you *must* use or *must not* use: a sponsor API, a required theme/track, a specific language, an offline requirement, a dataset you must use, hardware.
5. **What "done enough to win" looks like** - what's the single most impressive thing the demo must show working?

## Important (shapes architecture, ask if unclear)

6. **Target user / usage context** - who touches this and how (web app, mobile, API, CLI, physical device)?
7. **Data / model availability** - is there a dataset? An API? A pretrained model? Or does data need to be generated/scraped/faked? This is the #1 hackathon time-sink.
8. **Deployment target** - does it need to be live/hosted for the demo, or run on a laptop? (Affects whether to spend time on deploy.)
9. **Real-time vs batch** - does anything need to happen live during the demo (streaming, inference latency), or can it be precomputed?
10. **Existing assets** - any code, prior project, or template you're starting from?

## Nice-to-have (ask only if it affects a real decision)

11. Team's comfort with the proposed stack (don't pick React if nobody knows it and it's a 24h build).
12. Budget for paid APIs / GPU credits.
13. Any integrations the judges specifically reward on this track.

## How to run it

- Lead with the must-haves; they gate everything.
- Give your recommended answer with each question so the user can just confirm.
- If the user is vague on the problem, that's the first thing to resolve - everything downstream depends on it.
- Stop when you can architect with conviction. Over-grilling a hackathon plan wastes the very time it's meant to save.
