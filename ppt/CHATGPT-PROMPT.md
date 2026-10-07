# Prompt for ChatGPT

Attach `slides.md`, `SOURCES.md`, every file in `images/`, and, if you want it
restyled and not rebuilt, `SURYA-AGENT-Round1.pptx`. Then paste the prompt below.

---

Build an editable PowerPoint deck (.pptx) from the attached `slides.md` and the
pictures in `images/`. It is a Round 1 submission for a hackathon: JSS AI FORGE
36, AI for Industry 4.0 track, team SIGMOID. Judges will read it without a
presenter, so every slide has to make sense on its own.

**What you are given**

- `slides.md` has one section per slide: the section label, the title, every
  piece of text on the slide in reading order, which picture goes where, and the
  speaker notes.
- `images/` holds the pictures, named by slide number. They are screenshots of
  the working prototype.
- `SOURCES.md` says where every figure comes from. Use it to check yourself. Do
  not put it on a slide.

**Rules that are not negotiable**

1. Make a real, editable .pptx. Every piece of text is a text box I can click
   and retype. Tables are native PowerPoint tables. Diagrams are native shapes
   and connectors. Pictures are inserted as pictures. Do not render a slide, a
   table, a diagram or a block of text as an image.
2. Use the text in `slides.md` as written. You may shorten a sentence to fit,
   but do not change, round, re-unit or add a number. If a figure is not in
   `slides.md`, it does not go on the deck. Do not add statistics, market sizes
   or claims of your own.
3. Keep every label that says a figure is an assumption, an illustration, "as
   captured", simulated, or not built. They are the point of the deck.
4. Do not give the thermal classifier a score or call it finished. It is in
   progress and has no result.
5. The tariff is ₹2.446/kWh. Never write ₹2.44 by itself. Do not mention or
   estimate a deviation settlement (DSM) charge.
6. Array B-17 is "diagnosed". The other 119 arrays are "flagged from modelled
   signature". Do not swap those words.
7. Do not stretch, recolour, redraw or retouch a picture. Keep each one's own
   proportions. You may crop one only to show part of the screen more clearly.
   Do not generate new images.
8. Keep all 15 slides, in order, and keep the section label above each title.
   The seven numbered labels are the seven things the organisers ask for.
9. Put the speaker notes from `slides.md` into each slide's notes pane, not on
   the slide.
10. Slide 11 is an architecture diagram. Draw it from boxes and arrows, following
    the description in `slides.md`.

**Design**

- 16:9. The screenshots are dark, so use a dark background that they sit into,
  near black, with one warm accent (orange to amber) and one cool accent (teal).
  Red is for the critical figure and the operator's approval only.
- Titles about 28 pt, body text no smaller than 14 pt, captions no smaller than
  10 pt. Left-align body text. One plain sans-serif font throughout.
- No decorative stripes, no lines under titles, no clip art, no stock photos.
- Leave at least half an inch of margin. Nothing may overflow its box or run off
  the slide. If text does not fit, shorten the sentence, do not shrink it below
  the sizes above.

**Before you hand it back**

Check each slide: no text cut off, no picture distorted, every number matches
`slides.md` exactly, and every picture named for the slide is on it. Then tell me
anything you shortened, and anything in `slides.md` you could not fit.
