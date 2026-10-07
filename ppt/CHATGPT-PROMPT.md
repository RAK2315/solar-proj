# Prompt for ChatGPT

Attach `slides.md`, `SOURCES.md`, every file in `images/` and `images/icons/`,
and, if you want it restyled and not rebuilt, `SURYA-AGENT-Round1.pptx`. Then paste the prompt below.

---

Build an editable PowerPoint deck (.pptx) from the attached `slides.md` and the
pictures in `images/`. It is a Round 1 submission for a hackathon: JSS AI FORGE
36, AI for Industry 4.0 track, team SIGMOID. Judges will read it without a
presenter, so every slide has to make sense on its own.

**What you are given**

- `slides.md` has one section per slide: the title, which of the organisers'
  sections it covers, every piece of text on the slide in reading order, which
  picture and which icon goes where, and the speaker notes.
- `images/` holds the pictures, named by slide number. They are screenshots of
  the working prototype. `images/icons/` holds the icons, one file per icon and colour.
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
8. Keep all eight slides, in order, with their titles. Between them they cover
   the seven things the organisers ask for; `slides.md` says which slide covers
   which. Slides 2, 4, 6 and 8 carry no picture, on purpose: do not add one.
9. Put the speaker notes from `slides.md` into each slide's notes pane, not on
   the slide.
10. Slide 4 has a flow diagram and slide 2 a small one. Draw them from boxes and
    arrows, following the description in `slides.md`.

**Design**

- 16:9, white slides. The format is a dense idea-submission sheet, not a talk
  deck. Every slide has the same frame: "Sigmoid" in an outlined oval top left,
  the slide title centred in a bold black serif in capitals, "JSS AI FORGE 36 /
  AI for Industry 4.0" top right, and a blue footer band reading "@JSS AI FORGE
  36 Idea Submission" with the slide number.
- Content sits in blocks with a heavy rounded outline and a bold capital
  heading inside the top edge: navy by default, red for risks, green for how
  each risk is answered. Inside a block: rows of a coloured icon, a bold
  coloured lead and a sentence. Small figures sit in pale blue boxes.
- A slide may open with one line: a bold capital label, then the claim in
  plain weight ("PROPOSED SOLUTION: one closed loop...").
- Montserrat throughout, Times New Roman for the slide title. Body text about
  10 pt, never smaller than 9 pt; sources 8 to 9 pt. Left-align body text.
- Slide 7 has one native bar chart; keep it a chart, not a picture.
- No clip art, no stock photos, no decoration that carries no meaning.
- Nothing may overflow its box or run off the slide. If text does not fit,
  shorten the sentence; do not shrink it below the sizes above.

**Before you hand it back**

Check each slide: no text cut off, no picture distorted, every number matches
`slides.md` exactly, and every picture named for the slide is on it. Then tell me
anything you shortened, and anything in `slides.md` you could not fit.
