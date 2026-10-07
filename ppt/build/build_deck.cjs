/**
 * ppt/build/build_deck.cjs — writes ppt/SURYA-AGENT-Round1.pptx and ppt/slides.md.
 *
 * One source for both, so the deck and the hand-off notes cannot drift apart:
 * every text box, table, chart and picture placed on a slide is also recorded,
 * and slides.md is written from that record.
 *
 * Everything on a slide is native: text boxes, shapes, tables, a chart,
 * pictures. No slide is an image of a slide. Diagrams are drawn from shapes.
 * Icons are small pictures, written to ppt/images/icons/ so they can be reused.
 *
 * THE FORMAT IS THE OWNER'S, from decks of theirs they showed on 7 Oct 2026:
 * white, dense, the team mark in an outlined oval, a black serif title, blocks
 * in heavy rounded outlines with a bold capital heading, coloured icons beside
 * a bold coloured lead and a sentence, risks in red against answers in green,
 * and a blue footer band. Text is small on purpose: Round 1 is read, not
 * presented.
 *
 * FONTS. Montserrat for everything but the slide title, which is Times New
 * Roman. Montserrat is on the owner's machine; a machine without it will
 * substitute and reflow, which is why the PDF is what gets submitted.
 *
 * No figure is computed here. Each one is typed from the repo or from a capture
 * of the running product, and ppt/SOURCES.md says which.
 */
//   NODE_PATH=<folder holding pptxgenjs, react-icons, sharp>/node_modules node ppt/build/build_deck.cjs
//   APPLY_THEME=<path to apply_theme.js> writes the palette into the deck's theme.
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'images');
const ICONS = path.join(IMG, 'icons');
const OUT = path.join(ROOT, 'SURYA-AGENT-Round1.pptx');

const FONT = 'Montserrat';
const TITLE_FONT = 'Times New Roman';

const THEME = {
  name: 'Surya Sheet',
  headFontFace: TITLE_FONT,
  bodyFontFace: FONT,
  colors: {
    dk1: '111111', lt1: 'FFFFFF', dk2: '0B3C6F', lt2: 'EEF4FB',
    accent1: '1D6FB8', accent2: '0E7C86', accent3: 'B8322A', accent4: '2E7D32',
    accent5: '6A3FB5', accent6: 'D9730D', hlink: '1D6FB8', folHlink: '55606F',
  },
};
const HEX = THEME.colors;
/** The same colours by name, as hex: icons, table borders and chart parts take hex only. */
const INKS = { navy: HEX.dk2, teal: HEX.accent2, red: HEX.accent3, green: HEX.accent4, purple: HEX.accent5, orange: HEX.accent6, blue: HEX.accent1 };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';                       // 13.333 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'SURYA AGENT - Round 1';
pres.author = 'Team SIGMOID';
pres.company = 'Team SIGMOID';
const C = pres.SchemeColor;
const INK = C.text1; const NAVY = C.text2; const WHITE = C.background1; const TINT = C.background2;
const SCHEME = { navy: NAVY, teal: C.accent2, red: C.accent3, green: C.accent4, purple: C.accent5, orange: C.accent6, blue: C.accent1 };

const W = 13.333; const MX = 0.28; const CW = W - 2 * MX;
const TOP = 1.02;                                  // first line of content
const BOTTOM = 7.0;                                // last line of content
const BODY = 10; const SMALL = 9;

pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: HEX.lt1 },
  objects: [
    // The team mark: a name in an outlined oval. A real logo can be dropped over it.
    { text: { text: 'Sigmoid', options: { shape: pres.ShapeType.ellipse, x: MX + 0.05, y: 0.14, w: 1.75, h: 0.72, fill: { color: 'FFFFFF' }, line: { color: HEX.dk2, width: 2 }, color: HEX.dk2, fontSize: 19, bold: true, fontFace: FONT, align: 'center', valign: 'middle', margin: 0 } } },
    { text: { text: 'JSS AI FORGE 36', options: { x: W - MX - 2.7, y: 0.16, w: 2.7, h: 0.36, fontSize: 15, bold: true, color: HEX.dk2, fontFace: FONT, align: 'right', valign: 'middle', margin: 0 } } },
    { text: { text: 'AI for Industry 4.0', options: { x: W - MX - 2.7, y: 0.5, w: 2.7, h: 0.3, fontSize: 11, bold: true, color: HEX.accent2, fontFace: FONT, align: 'right', valign: 'middle', margin: 0 } } },
    { placeholder: { options: { name: 'title', type: 'title', x: 2.3, y: 0.1, w: W - 5.3, h: 0.8, fontSize: 32, bold: true, color: INK, fontFace: TITLE_FONT, margin: 0, valign: 'middle', align: 'center' }, text: 'TITLE' } },
    { rect: { x: 0, y: 7.14, w: W, h: 0.36, fill: { color: HEX.accent1 } } },
    { text: { text: '@JSS AI FORGE 36 Idea Submission', options: { x: 3, y: 7.14, w: W - 6, h: 0.36, fontSize: 10, color: 'FFFFFF', fontFace: FONT, align: 'center', valign: 'middle', margin: 0 } } },
  ],
  slideNumber: { x: W - 1.0, y: 7.14, w: 0.7, h: 0.36, fontSize: 10, color: 'FFFFFF', fontFace: FONT, align: 'right', valign: 'middle' },
});

// ---------------------------------------------------------------- the record
const record = [];
const sections = new Set();
let cur = null;
const imgSize = (file) => {
  const b = fs.readFileSync(path.join(IMG, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const flat = (t) => (Array.isArray(t) ? t.map((r) => r.text + (r.options && r.options.breakLine ? '\n' : '')).join('') : t);

function slide(section, title, covers, notes) {
  if (!sections.has(section)) { sections.add(section); pres.addSection({ title: section }); }
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: section });
  cur = { n: record.length + 1, title, covers, notes, text: [], pictures: [], s };
  record.push(cur);
  s.addText(title, { placeholder: 'title' });
  s.addNotes(notes);
  return s;
}
let seq = 0;
function text(t, o, log = true) {
  seq += 1;
  cur.s.addText(t, { isTextBox: true, margin: 0, color: INK, fontSize: BODY, fontFace: FONT, valign: 'top', objectName: `Text ${seq}`, ...o });
  if (log) cur.text.push(flat(t));
}
/** A filled block with text inside it: one shape, so it moves and edits as one thing. */
function card(t, o, log = true) {
  seq += 1;
  cur.s.addText(t, {
    shape: pres.ShapeType.roundRect, rectRadius: 0.06, fill: { color: TINT }, line: { color: HEX.dk2, width: 1 },
    margin: [4, 6, 4, 6], color: INK, fontSize: BODY, fontFace: FONT, valign: 'middle', objectName: `Card ${seq}`, ...o,
  });
  if (log) cur.text.push(flat(t));
}
/**
 * A block: a heavy rounded outline with a bold capital heading inside its top
 * edge. Returns where its contents start.
 */
function panel(title, x, y, w, h, colour = 'navy') {
  seq += 1;
  cur.s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: WHITE }, line: { color: INKS[colour], width: 2.5 }, objectName: `Panel ${seq}` });
  if (!title) return y + 0.12;
  seq += 1;
  cur.s.addText(title, { isTextBox: true, x: x + 0.16, y: y + 0.07, w: w - 0.32, h: 0.4, margin: 0, fontSize: 17, bold: true, color: SCHEME[colour], fontFace: FONT, valign: 'middle', objectName: `Heading ${seq}` });
  cur.text.push(`[${title}]`);
  return y + 0.52;
}
/** The line a slide opens with: a bold capital label, then the claim in plain weight. */
function lead(label, claim, y = TOP) {
  text([
    { text: `${label}  `, options: { bold: true, color: NAVY, fontSize: 18 } },
    { text: claim, options: { fontSize: 15 } },
  ], { x: MX + 0.05, y, w: CW - 0.1, h: 0.42, valign: 'middle' });
}
function arrow(x, y, w, h, shape = pres.ShapeType.downArrow, colour = 'navy') {
  seq += 1;
  cur.s.addShape(shape, { x, y, w, h, fill: { color: SCHEME[colour] }, line: { color: INKS[colour], width: 0 }, objectName: `Arrow ${seq}` });
}
/** A picture at a given width, its height taken from the file so it is never stretched. */
function picture(file, x, y, w, where, maxH) {
  const { w: pw, h: ph } = imgSize(file);
  let h = (w * ph) / pw;
  if (maxH && h > maxH) { h = maxH; w = (h * pw) / ph; }
  seq += 1;
  cur.s.addImage({ path: path.join(IMG, file), x, y, w, h, objectName: `Picture ${file}`, altText: where });
  seq += 1;
  cur.s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { type: 'none' }, line: { color: HEX.dk2, width: 1 }, objectName: `Picture frame ${seq}` });
  cur.pictures.push({ file, where });
  return { w, h };
}
const runs = (...parts) => parts.map(([t, o = {}]) => ({ text: t, options: { ...o, breakLine: o.breakLine ?? false } }));

/** An icon in one of the deck's colours. Each colour is its own small file. */
const usedIcons = new Set();
function iconFile(icon, colour) {
  usedIcons.add(`${icon}-${colour}`);
  return path.join(ICONS, `${icon}-${colour}.png`);
}
/**
 * An icon, a bold coloured lead and a sentence. `inline` runs the sentence on
 * from the lead, the way the feasibility blocks read; otherwise it sits under.
 */
function iconRow(icon, head, body, x, y, w, h, { colour = 'navy', inline = false, size = 0.42 } = {}) {
  seq += 1;
  cur.s.addImage({ path: iconFile(icon, colour), x, y: y + 0.03, w: size, h: size, objectName: `Icon ${seq} ${icon}`, altText: '' });
  const tx = x + size + 0.12;
  text(inline ? [
    { text: `${head} `, options: { bold: true, fontSize: 10.5, color: SCHEME[colour] } },
    { text: body, options: { fontSize: BODY } },
  ] : [
    { text: head, options: { bold: true, fontSize: 11, color: SCHEME[colour], breakLine: true } },
    { text: body, options: { fontSize: 9.5 } },
  ], { x: tx, y, w: w - size - 0.12, h }, false);
  cur.text.push(`(icon: ${icon}-${colour}) ${head}${inline ? ' ' : '\n'}${body}`);
}

function table(rows, o, colW, { fontSize = 9.5, head = true, border = { type: 'solid', pt: 0.75, color: HEX.dk2 } } = {}) {
  seq += 1;
  const body = rows.map((r, ri) => r.map((cell) => {
    const c = typeof cell === 'string' ? { text: cell } : cell;
    const isHead = head && ri === 0;
    return {
      text: c.text,
      options: {
        fontSize, fontFace: FONT, valign: 'middle', margin: [2, 5, 2, 5], border,
        color: isHead ? 'FFFFFF' : HEX.dk1, bold: isHead || c.bold,
        fill: { color: isHead ? HEX.dk2 : c.fill ?? 'FFFFFF' }, ...(c.options ?? {}),
      },
    };
  }));
  cur.s.addTable(body, { colW, objectName: `Table ${seq}`, ...o });
  const line = (r) => `| ${r.map((c) => (typeof c === 'string' ? c : c.text)).join(' | ')} |`;
  cur.text.push([line(rows[0]), `|${rows[0].map(() => '---').join('|')}|`, ...rows.slice(1).map(line)].join('\n'));
}

// --------------------------------------------------------------------- icons
const ICON_SET = {
  robot: 'FaRobot', eye: 'FaEye', clock: 'FaClock', user: 'FaUserCheck', calc: 'FaCalculator', sync: 'FaSyncAlt',
  rupee: 'FaRupeeSign', users: 'FaUsers', leaf: 'FaLeaf', hat: 'FaHardHat', flask: 'FaFlask', rocket: 'FaRocket',
  globe: 'FaGlobe', shield: 'FaShieldAlt', scale: 'FaBalanceScale', bolt: 'FaBolt', plane: 'FaPaperPlane',
  chart: 'FaChartLine', tools: 'FaTools', file: 'FaFileSignature', code: 'FaCode', react: 'FaReact',
  cube: 'FaCube', python: 'FaPython', github: 'FaGithub', puzzle: 'FaPuzzlePiece', calendar: 'FaCalendarCheck',
  desktop: 'FaDesktop', coins: 'FaCoins', search: 'FaSearch',
};
/** Draws every icon the slides asked for, in the colour each asked for, and clears out the rest. */
async function makeIcons() {
  fs.rmSync(ICONS, { recursive: true, force: true });
  fs.mkdirSync(ICONS, { recursive: true });
  for (const key of usedIcons) {
    const cut = key.lastIndexOf('-');
    const name = key.slice(0, cut); const colour = key.slice(cut + 1);
    const comp = fa[ICON_SET[name]];
    if (!comp) throw new Error(`no icon named ${name}`);
    const svg = renderToStaticMarkup(React.createElement(comp, { color: `#${INKS[colour]}`, size: 256 }));
    await sharp(Buffer.from(svg)).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(ICONS, `${name}-${colour}.png`));
  }
}

function build() {
  // ================================================================ 1  title
  {
    slide('Title', 'SURYA AGENT', 'Title slide',
      'Fifteen seconds. Surya watches a 500 MW block of Bhadla Solar Park, sends a drone to verify what telemetry cannot, and hands the operator a ranked, deadlined repair plan to approve. '
      + 'Say "a 500 MW block of Bhadla" out loud: it is accurate and it answers "why only 120 arrays" before it is asked. '
      + 'The four figures along the bottom are the four on the product\'s own landing page, and each is computed from the physics model or read from the committed detector result. 364 MW is 73 per cent of nameplate because the cells are at 62.8 degrees; that is the model, not a fault. '
      + 'The picture is the main view of the working prototype in its light theme: the 3D twin of the modelled block. '
      + 'Team departments are not on the slide because they were not supplied.');
    const lw = 6.1;
    text('The plan, not the picture.', { x: MX + 0.05, y: TOP + 0.05, w: lw, h: 0.6, fontSize: 27, bold: true, color: NAVY });
    text('An AI agent that watches a 500 MW block of Bhadla Solar Park, sends a drone to verify what telemetry cannot, and hands the operator a ranked repair plan with a computed deadline. A person approves it before anything is scheduled.',
      { x: MX + 0.05, y: TOP + 0.72, w: lw, h: 1.05, fontSize: 12.5 });
    table([
      [{ text: 'Event', bold: true, fill: HEX.lt2 }, 'JSS AI FORGE 36, Round 1 idea submission'],
      [{ text: 'Track', bold: true, fill: HEX.lt2 }, 'AI for Industry 4.0: predictive maintenance, automation, digital twins'],
      [{ text: 'Team', bold: true, fill: HEX.lt2 }, 'SIGMOID'],
      [{ text: 'Members', bold: true, fill: HEX.lt2 }, 'Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal'],
      [{ text: 'Prototype', bold: true, fill: HEX.lt2 }, 'Built and running. github.com/RAK2315/solar-proj'],
    ], { x: MX + 0.05, y: TOP + 1.92, w: lw }, [1.2, lw - 1.2], { fontSize: 10.5, head: false });
    const px = MX + lw + 0.35; const pw = CW - lw - 0.35;
    panel('', px, TOP + 0.02, pw, 4.22);
    const p = picture('01-twin-field.png', px + 0.15, TOP + 0.17, pw - 0.3, 'right: the 3D twin of the field from the Site screen, light theme, cropped to the field', 3.7);
    text('The running prototype: a 3D twin of 120 arrays. B-17 is the red one.', { x: px + 0.15, y: TOP + 0.17 + p.h + 0.05, w: pw - 0.3, h: 0.24, fontSize: SMALL, bold: true, color: NAVY, align: 'center' });
    const stats = [
      ['364 MW', 'delivered from 500 MW nameplate, at 62.8 °C cell temperature', 'navy'],
      ['−41.7 %', 'on array B-17: 5 of its 7 strings bypassed', 'red'],
      ['3.07 MWh', 'lost over 72 h if nobody acts before 14:00', 'orange'],
      ['0.995', 'AP@50 for cracked panels, held-out test split', 'green'],
    ];
    const sw = (CW - 0.45) / 4; const sy = BOTTOM - 1.3;
    stats.forEach(([big, small, col], i) => {
      const x = MX + i * (sw + 0.15);
      panel('', x, sy, sw, 1.3, col);
      text([
        { text: big, options: { fontSize: 24, bold: true, color: SCHEME[col], breakLine: true } },
        { text: small, options: { fontSize: 10 } },
      ], { x: x + 0.18, y: sy + 0.1, w: sw - 0.36, h: 1.1, valign: 'middle' });
    });
  }

  // ============================================================== 2  problem
  {
    slide('Problem', 'PROBLEM STATEMENT', 'Round 1 sections 1 and 2: problem statement and target beneficiaries; existing gaps',
      'The framing is continuous against annual, not fast against slow. The two quoted findings are from Sheppard, Cook and Perullo of Turbine Logic with Fregosi and Bolen of EPRI, '
      + '"Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation", hosted on OSTI. It is not an NREL paper; do not call it one. '
      + 'The third figure comes from our own model of one faulted array, B-17: 5 of its 7 strings are bypassed, so the array is 41.7 per cent down while the worst string is 58.4 per cent down. The rupee figure is 3.07 MWh at the blended Bhadla Phase-III tariff of 2.446 rupees per kWh. '
      + 'On gaps, be fair to the incumbents: Raptor Maps, Zeitview and Sitemark already do drone thermal imaging with AI classification at utility scale, and Raptor Maps and Sitemark are building 3D twins. So the twin and the detection are table stakes and we do not pitch either as our difference. The comparison is from our own prior-art sweep of 4 October 2026, read from their public material; it is not a benchmark. '
      + 'Do not quote a soiling-loss percentage or a national rupee figure: we hold no source for one.');
    lead('THE PROBLEM:', 'the plant knows its output fell, not why, or how long it can wait.');
    const y0 = TOP + 0.52; const lw = 6.1; const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    // Left: what telemetry says and cannot say, as a diagram.
    const mid = MX + lw / 2;
    card('PLANT TELEMETRY (SCADA)', { x: mid - 1.7, y: y0, w: 3.4, h: 0.42, bold: true, align: 'center', fontSize: 12, color: NAVY, fill: { color: TINT }, line: { color: HEX.dk2, width: 2 } });
    arrow(MX + 1.35, y0 + 0.46, 0.24, 0.26);
    arrow(MX + lw - 1.6, y0 + 0.46, 0.24, 0.26);
    card([{ text: 'WHAT IT SAYS', options: { bold: true, color: SCHEME.green, fontSize: 11, breakLine: true } }, { text: 'An inverter or a string is producing less than it should' }],
      { x: MX, y: y0 + 0.76, w: 2.9, h: 0.92, align: 'center', fill: { color: WHITE }, line: { color: INKS.green, width: 2 } });
    card([{ text: 'WHAT IT CANNOT SAY', options: { bold: true, color: SCHEME.red, fontSize: 11, breakLine: true } }, { text: 'Which module?    Dirt or damage?    How urgent?', options: { bold: true } }],
      { x: MX + 3.05, y: y0 + 0.76, w: lw - 3.05, h: 0.92, align: 'center', fill: { color: WHITE }, line: { color: INKS.red, width: 2 } });
    arrow(mid - 0.12, y0 + 1.72, 0.24, 0.24, pres.ShapeType.downArrow, 'red');
    card([
      { text: 'SO THE FAULT WAITS  ', options: { bold: true, color: SCHEME.red, fontSize: 11 } },
      { text: 'Someone drives out to look, or it sits until the next aerial survey. In our model, soiling and a cracked cell look the same from telemetry: only imaging separates them.' },
    ], { x: MX, y: y0 + 2.0, w: lw, h: 0.82, fill: { color: WHITE }, line: { color: INKS.red, width: 2 } });
    const stats = [
      ['Annual', 'the usual cadence of aerial infrared inspection', 'navy'],
      ['Weeks to months', 'faults below the inverter go undetected', 'orange'],
      ['−41.7 %', 'one cracked array in our model: 3.07 MWh, ₹7,509 lost in 72 h', 'red'],
    ];
    const sw = (lw - 0.2) / 3; const sy = y0 + 2.94;
    stats.forEach(([big, small, col], i) => {
      card([
        { text: big, options: { fontSize: 14, bold: true, color: SCHEME[col], breakLine: true } },
        { text: small, options: { fontSize: 9 } },
      ], { x: MX + i * (sw + 0.1), y: sy, w: sw, h: 0.9, margin: [3, 6, 3, 6] });
    });
    text('Sources: Turbine Logic and EPRI, osti.gov/servlets/purl/1960134; third figure, our PV model.', { x: MX, y: sy + 0.93, w: lw, h: 0.2, fontSize: 8, color: C.accent1 });
    const wy = sy + 1.18;
    const wi = panel('WHO BENEFITS', MX, wy, lw, BOTTOM - wy);
    const bw = (lw - 0.3) / 3;
    iconRow('tools', 'O&M crews', 'Which array, what repair, by when', MX + 0.15, wi, bw - 0.05, 0.8, { colour: 'navy' });
    iconRow('rupee', 'Asset owners', 'Loss in MWh and in rupees', MX + 0.15 + bw, wi, bw - 0.05, 0.8, { colour: 'green' });
    iconRow('bolt', 'Grid off-taker', 'More contracted energy delivered', MX + 0.15 + 2 * bw, wi, bw - 0.05, 0.8, { colour: 'purple' });

    // Right: existing gaps.
    const gi = panel('EXISTING GAPS', rx, y0, rw, BOTTOM - y0);
    table([
      ['Approach', 'What it gives', 'What is still missing'],
      ['Plant SCADA and inverter monitoring', 'Output fell, at an inverter or a string', 'Which module, why, and how urgent'],
      ['Annual aerial infrared survey', 'A thermal map of the whole field', 'Flown once a year, so faults sit for weeks to months'],
      ['Drone and AI inspection platforms (Raptor Maps, Zeitview, Sitemark)', 'Thermal imaging, AI defect classes, 3D twins under way', 'A report of defects. No deadline, no crew plan, no re-plan when conditions change'],
      [{ text: 'SURYA AGENT', bold: true, options: { color: HEX.dk2 }, fill: HEX.lt2 },
        { text: 'A ranked work order with a computed deadline, re-derived live, arithmetic on screen', bold: true, fill: HEX.lt2 },
        { text: 'A prototype on simulated telemetry. Not yet connected to a real plant', fill: HEX.lt2 }],
    ], { x: rx + 0.15, y: gi, w: rw - 0.3 }, [1.85, 2.1, rw - 4.25], { fontSize: 9 });
    const ny = gi + 2.72;
    iconRow('search', 'What nobody hands over', 'A defect report tells you a panel is bad. It does not tell you when the damage stops being recoverable, which job the crew should do first, or what changes when the weather turns.', rx + 0.15, ny, rw - 0.3, 0.9, { colour: 'red' });
    iconRow('scale', 'What we do not claim', 'The twin and the detection already exist elsewhere, and our thermal evidence comes from Raptor Maps’ own open dataset. What we add is the step after the picture.', rx + 0.15, ny + 0.98, rw - 0.3, 0.8, { colour: 'navy' });
    text('Gaps from our prior-art sweep of 4 Oct 2026, read from each company’s public material. Not a benchmark.', { x: rx + 0.15, y: BOTTOM - 0.3, w: rw - 0.3, h: 0.22, fontSize: 8.5, color: C.accent1 });
  }

  // ============================================================= 3  solution
  {
    slide('Solution', 'OUR SOLUTION', 'Round 1 section 3: proposed AI solution',
      'This is the product. Seven of the eight steps run without a person; the eighth is a person on purpose. The drone is not the product: it is how the agent gets evidence it cannot infer from telemetry. '
      + 'The two pictures are from the running prototype on 7 October 2026, flown at 60 times site speed. First: the frame the drone\'s camera returned over B-17, with the box our detector drew on it in the browser. On this flight it returned Cracked at 0.89. On the photograph the committed figure was measured on, the same weights return 0.91 against a committed 0.9084. Second: the same pass in false colour; it is a rendering of the simulated scene, not a thermal capture. '
      + 'The real thermal evidence is a UAV frame from Raptor Maps\' open dataset, processed into the panel\'s 5 by 7 cells: four hot cells in row 2, columns 3 to 6, about 2.8 degrees above the rest, one connected band. '
      + 'The detector: YOLOv8n fine-tuned on 921 images, CC BY 4.0. Cracked AP at 50 is 0.995 on the held-out test split. The language model, openai/gpt-oss-120b on Groq, writes the triage in words and never supplies a number: the server recomputes every fact and cross-checks the reply. '
      + 'The queue order is deliberately not AI. The thermal classifier is in progress: a notebook and 119 modelled frames exist, no model is trained and no score is quoted. '
      + 'Vocabulary: B-17 is diagnosed, because it has a real capture. The other 119 arrays are flagged from modelled signature. '
      + 'The loop follows the RAISE-winning Robinsun solar agent, credited on the last slide.');
    lead('PROPOSED SOLUTION:', 'one closed loop, from a telemetry anomaly to an approved work order.');
    const steps = ['Telemetry anomaly', 'Agent triage', 'Drone dispatch', 'Evidence capture', 'Vision analysis', 'Prognosis and deadline', 'Ranked plan', 'Human approval'];
    const sw = 1.38; const sg = (CW - 8 * sw) / 7; const ly = TOP + 0.5;
    steps.forEach((label, i) => {
      const x = MX + i * (sw + sg); const last = i === steps.length - 1;
      card([
        { text: `${i + 1}  `, options: { bold: true, color: last ? WHITE : SCHEME.orange, fontSize: 12 } },
        { text: label, options: { bold: true, color: last ? WHITE : NAVY, fontSize: 10 } },
      ], { x, y: ly, w: sw, h: 0.6, margin: [2, 5, 2, 5], fill: { color: last ? SCHEME.red : TINT }, line: { color: last ? INKS.red : HEX.dk2, width: 1.5 } }, false);
      if (!last) arrow(x + sw + 0.03, ly + 0.21, sg - 0.06, 0.18, pres.ShapeType.rightArrow);
    });
    cur.text.push(`Loop, left to right: ${steps.map((l, i) => `${i + 1} ${l}`).join(' > ')}`);

    const y0 = ly + 0.74; const lw = 5.75; const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    // Left: each problem against how it is answered.
    text('Actual problem', { x: MX, y: y0, w: 2.65, h: 0.24, fontSize: 12, bold: true, align: 'center' });
    text('Problems faced today', { x: MX, y: y0 + 0.23, w: 2.65, h: 0.2, fontSize: 9, bold: true, color: NAVY, align: 'center' }, false);
    text('Proposed solution', { x: MX + 2.95, y: y0, w: lw - 2.95, h: 0.24, fontSize: 12, bold: true, align: 'center' });
    text('How we answer each one', { x: MX + 2.95, y: y0 + 0.23, w: lw - 2.95, h: 0.2, fontSize: 9, bold: true, color: NAVY, align: 'center' }, false);
    const none = { type: 'none' }; const under = { type: 'solid', pt: 1, color: HEX.accent3 }; const box = { type: 'solid', pt: 1, color: HEX.dk2 };
    const pairs = [
      ['Faults wait for a yearly aerial survey', 'Every array watched continuously against a physics model'],
      ['Telemetry cannot tell dirt from damage', 'A drone is sent only when imaging would add something'],
      ['A defect report carries no deadline', 'A deadline computed from the defect and the 72 h forecast'],
      ['What to fix first is a judgement call', 'One fixed formula, with its arithmetic on screen'],
      ['A plan goes stale when the weather turns', 'The queue and the crew day re-derive live'],
      ['Automation nobody signed off', 'Nothing is scheduled until an operator approves'],
    ];
    seq += 1;
    cur.s.addTable(pairs.map(([a, b]) => [
      { text: a, options: { italic: true, bold: true, color: HEX.accent3, fontSize: 9.5, fontFace: FONT, valign: 'middle', margin: [3, 4, 3, 4], border: [under, none, under, none] } },
      { text: '–', options: { bold: true, color: HEX.dk2, fontSize: 11, fontFace: FONT, align: 'center', valign: 'middle', border: [none, none, none, none] } },
      { text: b, options: { bold: true, color: HEX.dk1, fontSize: 9.5, fontFace: FONT, valign: 'middle', margin: [3, 6, 3, 6], border: [box, box, box, box] } },
    ]), { x: MX, y: y0 + 0.5, w: lw, colW: [2.65, 0.3, lw - 2.95], rowH: 0.47, objectName: `Table ${seq}` });
    cur.text.push(['| Actual problem | Proposed solution |', '|---|---|', ...pairs.map(([a, b]) => `| ${a} | ${b} |`)].join('\n'));
    const hy = y0 + 0.5 + 6 * 0.47 + 0.14;
    card(runs(
      ['Honest wording: ', { bold: true, color: SCHEME.red }],
      ['B-17 is diagnosed from a real thermal capture. The other 119 arrays are flagged from modelled signature. The build fails if the two are mixed.'],
    ), { x: MX, y: hy, w: lw, h: BOTTOM - hy, fontSize: 9.5 });

    // Right, above: the running prototype.
    const ph = 2.3;
    panel('', rx, y0, rw, ph);
    const tw = 2.15;
    text([
      { text: 'The running prototype', options: { bold: true, fontSize: 13, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
      { text: 'Not a mock-up. The detector we trained runs in the browser on the frame the drone’s camera returned: Cracked 0.89 on B-17. The thermal pass beside it is a rendering of the simulated scene.', options: { fontSize: 9.5 } },
    ], { x: rx + 0.15, y: y0 + 0.12, w: tw, h: 1.75 });
    seq += 1;
    cur.s.addImage({ path: iconFile('github', 'navy'), x: rx + 0.15, y: y0 + ph - 0.48, w: 0.3, h: 0.3, objectName: `Icon ${seq} github`, altText: '' });
    // A hyperlink run here made PowerPoint refuse the file, so the address is plain text.
    text('github.com/RAK2315/solar-proj', { x: rx + 0.5, y: y0 + ph - 0.48, w: 1.85, h: 0.3, fontSize: 7.5, bold: true, color: NAVY, valign: 'middle' });
    const pw = (rw - tw - 0.55) / 2; const pxx = rx + tw + 0.3;
    const p1 = picture('03-drone-detection.png', pxx, y0 + 0.14, pw, 'right, upper block: the drone’s camera frame over B-17 with the detector’s box', ph - 0.62);
    picture('03-thermal-pass.png', pxx + pw + 0.1, y0 + 0.14, pw, 'right, upper block, beside it: the thermal pass over the same module', ph - 0.62);
    text('Detection, in the browser', { x: pxx, y: y0 + 0.14 + p1.h + 0.04, w: pw, h: 0.2, fontSize: SMALL, bold: true, color: NAVY, align: 'center' });
    text('Thermal pass, rendered', { x: pxx + pw + 0.1, y: y0 + 0.14 + p1.h + 0.04, w: pw, h: 0.2, fontSize: SMALL, bold: true, color: NAVY, align: 'center' });

    // Right, below: where the AI is.
    const ay = y0 + ph + 0.14;
    const ai = panel('WHERE THE AI IS', rx, ay, rw, BOTTOM - ay);
    const rows = [
      ['eye', 'Vision detector, trained by us', 'YOLOv8n on 921 labelled photographs. Cracked AP@50 0.995, held-out test split.', 'navy'],
      ['robot', 'Agent reasoning', 'openai/gpt-oss-120b on Groq writes the triage. It never supplies a number.', 'purple'],
      ['clock', 'Prognosis that ends in an hour', 'A thermal-dose model and the 72 h forecast give "act before 14:00".', 'orange'],
      ['calc', 'Crew plan, exact optimisation', 'A mixed-integer program, HiGHS in WebAssembly, capped at 50 ms.', 'green'],
    ];
    const gw = (rw - 0.4) / 2; const gh = 0.66;
    rows.forEach(([ic, h, b, col], i) => iconRow(ic, h, b, rx + 0.15 + (i % 2) * (gw + 0.1), ai + Math.floor(i / 2) * gh, gw, gh - 0.04, { colour: col }));
    text(runs(
      ['Not AI, on purpose: ', { bold: true, color: NAVY }],
      ['the queue order is a fixed formula.  ', {}],
      ['In progress, no result claimed: ', { bold: true, color: SCHEME.red }],
      ['a thermal classifier on Raptor Maps’ InfraredSolarModules.'],
    ), { x: rx + 0.15, y: ai + 2 * gh + 0.02, w: rw - 0.3, h: BOTTOM - (ai + 2 * gh) - 0.1, fontSize: 9, valign: 'middle' });
  }

  // ================================================================= 4  tech
  {
    slide('Technology', 'TECH STACK AND FLOW', 'Round 1 section 6: prototype architecture',
      'Read the left side top to bottom. Before the build: Python scripts hold the PV model and generate the site and its telemetry; a Colab notebook trained the detector and exported it to ONNX; an image-processing script turned a real thermal frame into the cell grid. '
      + 'The build gate runs in order: validate every data file against its Zod schema and 16 invariants, scan the source for hardcoded numbers and forbidden wording, run 457 tests, then compile. The TypeScript physics is golden-tested against the Python. If a headline figure moves, the build fails, not the demo. '
      + 'At run time, in the browser, there is one clock, the site time. Everything on screen is a pure function of that clock and the scenario events, which is why you can seek backwards and a dropped hazard un-happens. '
      + 'The detector and the solver both run as WebAssembly on the operator\'s machine. There is exactly one network call: the triage route, which calls Groq and cross-checks the reply against the physics on the server. There is no database. A work order is created only by the operator\'s click. '
      + 'On the choices: we refused a second service because a cold start on stage is a demo failure, so the solver is HiGHS compiled to WebAssembly and not OR-Tools behind a Python server. '
      + 'This diagram is drawn from native shapes so it can be edited.');
    const lw = 7.85; const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    text('A physics model, a trained detector and an exact solver, all running in the browser, behind a build that fails if a number drifts.',
      { x: MX + 0.05, y: TOP, w: lw - 0.1, h: 0.44, fontSize: 11, bold: true, color: NAVY, valign: 'middle' });
    const lab = 1.15; const gx = MX + lab; const gw = lw - lab;
    const label = (t, y, h) => text(t, { x: MX, y, w: lab - 0.12, h, fontSize: 10.5, bold: true, color: NAVY, valign: 'middle', align: 'center' }, false);
    const chip = (t, x, y, w, h, o = {}) => card(t, { x, y, w, h, fontSize: 9.5, align: 'center', margin: [2, 4, 2, 4], ...o }, false);
    const two = (a, b, colour = NAVY) => [{ text: a, options: { bold: true, color: colour, breakLine: true } }, { text: b, options: { fontSize: 9 } }];
    let y = TOP + 0.52;
    label('BEFORE THE BUILD', y, 0.72);
    const r1 = [['PV model and generators', 'Python'], ['Detector training', 'YOLOv8n to ONNX, on Colab'], ['Thermal cell grid', 'classical image processing']];
    const w3 = (gw - 0.2) / 3;
    r1.forEach(([a, b], i) => chip(two(a, b), gx + i * (w3 + 0.1), y, w3, 0.72));
    arrow(gx + gw / 2 - 0.14, y + 0.75, 0.28, 0.22);
    y += 1.0;
    label('BUILD GATE', y, 0.56);
    chip('Zod schemas and 16 invariants   >   scan for hardcoded numbers and wording   >   457 tests, physics golden-tested against Python   >   compile',
      gx, y, gw, 0.56, { fill: { color: NAVY }, color: WHITE, bold: true });
    arrow(gx + gw / 2 - 0.14, y + 0.59, 0.28, 0.22);
    y += 0.84;
    label('IN THE BROWSER', y, 1.98);
    chip('ONE CLOCK: site time. Every screen is a pure function of it and the scenario events', gx, y, gw, 0.42, { fill: { color: SCHEME.teal }, color: WHITE, bold: true, line: { color: INKS.teal, width: 1 } });
    const grid = [['PV model per array', 'plus dropped hazards'], ['Ranked queue', 'one fixed formula'], ['Crew plan', 'HiGHS in WebAssembly'], ['Detector', 'ONNX Runtime Web'], ['3D twin', 'React Three Fiber'], ['Glass overlay', 'six screens, 2D fallback']];
    grid.forEach(([a, b], i) => chip(two(a, b, SCHEME.teal), gx + (i % 3) * (w3 + 0.1), y + 0.52 + Math.floor(i / 3) * 0.74, w3, 0.66, { fill: { color: WHITE }, line: { color: INKS.teal, width: 1.5 } }));
    arrow(gx + gw / 4 - 0.14, y + 2.01, 0.28, 0.22);
    arrow(gx + (3 * gw) / 4 - 0.14, y + 2.01, 0.28, 0.22);
    y += 2.26;
    label('WHAT LEAVES IT', y, BOTTOM - y);
    const w2 = (gw - 0.1) / 2; const h4 = BOTTOM - y;
    chip([{ text: 'ONE NETWORK CALL', options: { bold: true, color: NAVY, breakLine: true } }, { text: '/api/triage to Groq. The server recomputes the facts and cross-checks the reply' }], gx, y, w2, h4, { line: { color: HEX.dk2, width: 2 } });
    chip([{ text: 'THE OPERATOR', options: { bold: true, color: WHITE, breakLine: true } }, { text: 'approves or declines. Only then does a work order exist', options: { color: WHITE } }], gx + w2 + 0.1, y, w2, h4, { fill: { color: SCHEME.red }, line: { color: INKS.red, width: 1 } });
    cur.text.push('Flow diagram, top to bottom, with a label at the left of each row:');
    cur.text.push(`BEFORE THE BUILD: ${r1.map(([a, b]) => `${a}, ${b}`).join(' | ')}`);
    cur.text.push('BUILD GATE: Zod schemas and 16 invariants > scan for hardcoded numbers and wording > 457 tests, physics golden-tested against Python > compile');
    cur.text.push(`IN THE BROWSER: ONE CLOCK: site time. Every screen is a pure function of it and the scenario events | ${grid.map(([a, b]) => `${a}, ${b}`).join(' | ')}`);
    cur.text.push('WHAT LEAVES IT: ONE NETWORK CALL, /api/triage to Groq. The server recomputes the facts and cross-checks the reply | THE OPERATOR approves or declines. Only then does a work order exist');

    const sh = 3.02;
    const si = panel('TECHNOLOGY STACK', rx, TOP, rw, sh);
    const stack = [
      ['react', 'Frontend', [['Next.js 15', 'navy'], [' + ', ''], ['React 19', 'teal'], [' + ', ''], ['TypeScript', 'navy']]],
      ['cube', '3D twin', [['three.js', 'navy'], [' + ', ''], ['React Three Fiber', 'teal']]],
      ['eye', 'Vision', [['YOLOv8n', 'navy'], [' on ', ''], ['ONNX Runtime Web', 'teal']]],
      ['calc', 'Optimiser', [['HiGHS', 'navy'], [' in ', ''], ['WebAssembly', 'teal']]],
      ['robot', 'Agent', [['openai/gpt-oss-120b', 'navy'], [' on ', ''], ['Groq', 'teal']]],
      ['python', 'Offline', [['Python', 'navy'], [' + ', ''], ['Colab T4', 'teal'], [' for training', '']]],
    ];
    const srow = (sh - 0.6) / stack.length;
    stack.forEach(([ic, lab2, parts], i) => {
      const yy = si + i * srow;
      seq += 1;
      cur.s.addImage({ path: iconFile(ic, 'blue'), x: rx + 0.18, y: yy + 0.04, w: 0.3, h: 0.3, objectName: `Icon ${seq} ${ic}`, altText: '' });
      text(`${lab2}:`, { x: rx + 0.6, y: yy, w: 1.15, h: srow, fontSize: 11, bold: true, valign: 'middle' }, false);
      text(parts.map(([t, col]) => ({ text: t, options: { bold: true, fontSize: 10.5, color: col ? SCHEME[col] : INK } })), { x: rx + 1.75, y: yy, w: rw - 1.9, h: srow, valign: 'middle' }, false);
      cur.text.push(`(icon: ${ic}-blue) ${lab2}: ${parts.map(([t]) => t).join('')}`);
    });
    const wy = TOP + sh + 0.14;
    const wi = panel('WHY THESE CHOICES', rx, wy, rw, BOTTOM - wy);
    const why = [
      ['globe', 'Everything in the browser', 'no GPU and no model server, so nothing can cold-start in front of a judge.', 'navy'],
      ['scale', 'An exact solver beside a heuristic', 'a new rule is one line of a model, and the answer is provable.', 'green'],
      ['shield', 'The model writes words, not numbers', 'every figure comes from the physics and is cross-checked.', 'purple'],
      ['sync', 'One clock', 'seek backwards and every screen is correct. Same input, same site.', 'teal'],
    ];
    const wh = (BOTTOM - wi - 0.08) / 4;
    why.forEach(([ic, h, b, col], i) => iconRow(ic, h, b, rx + 0.18, wi + i * wh, rw - 0.36, wh - 0.04, { colour: col, inline: true, size: 0.36 }));
  }

  // ================================================================== 5  usp
  {
    slide('USP', 'OUR USP', 'Round 1 section 4: innovation and uniqueness',
      'Our difference is deliberately not the twin and not the detection. It is what happens after the picture: a deadline, a plan that re-derives, the arithmetic, and a human gate. '
      + 'The first picture is the Queue screen. Every job prints its own working. At the moment captured, B-17 reads 1.01 MWh a day, times 3.0 for critical, times 7.69 urgency, divided by 1.0 access, equals 23.29. Urgency is 1 plus 24 over the hours left, so the score rises as the deadline closes and reads differently at a different minute. If a judge asks how it prioritises, open src/lib/ranking.ts. '
      + 'The second picture is the live demonstration. A judge names a hazard; we drag it onto the field. Here a dust storm was dropped over part of Zone B. The screen reads: 8 arrays affected, 6 jobs added, 1 displaced, B-17 still first. Over the next 72 hours the dust costs the modelled arrays 5.61 MWh, 13,714 rupees at 2.446 rupees per kWh, forecast band 12,518 to 14,880. '
      + 'Measured in Chrome on our laptop: from releasing the pointer to the re-planned frame being painted takes 31 to 40 milliseconds against a budget of 150, and the twin holds 60.1 frames a second. '
      + 'Be straight about three things. The hazard strengths are declared assumptions; none is a measurement of Bhadla. The forecast band is a declared plus or minus 5 to 15 per cent on irradiance, not a fitted error model. And at this moment the heuristic matched the optimum; we do not claim the solver beats it here. A 5.8 per cent difference does exist on one ordinary afternoon, 14:17 site time.');
    lead('THE PLAN, NOT THE PICTURE:', 'others detect and report. We hand over a deadline and a plan.');
    const y0 = TOP + 0.52; const lw = 5.0;
    const ui = panel('INNOVATION AND UNIQUENESS', MX, y0, lw, BOTTOM - y0);
    const usp = [
      ['clock', 'A computed deadline', 'Not a flagged defect: an hour, worked out from the defect, its mechanism and the 72 h forecast.', 'navy'],
      ['sync', 'A plan that re-derives live', 'Change the conditions and the queue, the deadlines and the crew day are worked out again.', 'teal'],
      ['calc', 'Arithmetic on screen', 'The ranking formula with its inputs on every job, and a ? on every number for its source.', 'purple'],
      ['user', 'A human gate', 'The agent proposes. Only an operator’s click creates a work order.', 'red'],
      ['plane', 'It says no', 'A dirty array gets a wash crew and no flight: imaging it would add nothing.', 'green'],
    ];
    const uh = 0.78;
    usp.forEach(([ic, h, b, col], i) => iconRow(ic, h, b, MX + 0.18, ui + i * uh, lw - 0.36, uh - 0.04, { colour: col }));
    const fy = ui + usp.length * uh + 0.02;
    card([
      { text: 'score = loss per day × severity × urgency ÷ access', options: { bold: true, color: NAVY, fontSize: 10.5, breakLine: true } },
      { text: 'B-17 as captured: 1.01 MWh × 3.0 × 7.69 ÷ 1.0 = 23.29', options: { fontSize: 10, bold: true, color: SCHEME.red, breakLine: true } },
      { text: 'Urgency is 1 + 24 ÷ hours left. Next is A-08 at 0.81.', options: { fontSize: 9 } },
    ], { x: MX + 0.18, y: fy, w: lw - 0.36, h: BOTTOM - fy - 0.14 });

    const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    const top = 3.1;
    panel('', rx, y0, rw, top);
    const qw = 3.05;
    const q = picture('05-queue-arithmetic.png', rx + 0.15, y0 + 0.15, qw, 'right, upper block: the repair queue on the Queue screen, each job with its arithmetic');
    text('Every job shows its working.', { x: rx + 0.15, y: y0 + 0.15 + q.h + 0.05, w: qw, h: 0.22, fontSize: SMALL, bold: true, color: NAVY, align: 'center' });
    const sx = rx + qw + 0.3; const swid = rw - qw - 0.45;
    const s5 = picture('05-sandbox-hazard.png', sx, y0 + 0.15, swid, 'right, upper block, beside it: the Sandbox screen after a dust storm was dropped on Zone B', top - 0.6);
    text('The what-if sandbox: a dust storm dropped on Zone B.', { x: sx, y: y0 + 0.15 + s5.h + 0.05, w: swid, h: 0.22, fontSize: SMALL, bold: true, color: NAVY, align: 'center' });
    const dy = y0 + top + 0.14;
    const di = panel('THE LIVE DEMONSTRATION', rx, dy, rw, BOTTOM - dy);
    text('Name a hazard, drag it onto the field, and the whole plan re-derives.', { x: rx + 0.16, y: di - 0.04, w: rw - 0.32, h: 0.24, fontSize: 10.5, bold: true });
    const cw3 = (rw - 0.5) / 3; const cy = di + 0.28; const ch = BOTTOM - cy - 0.14;
    card([
      { text: 'What the screen said', options: { bold: true, color: NAVY, fontSize: 10.5, breakLine: true } },
      { text: '8 arrays affected, 6 jobs added, 1 displaced, B-17 still first.', options: { fontSize: 9.5 } },
    ], { x: rx + 0.15, y: cy, w: cw3, h: ch });
    card([
      { text: 'What it costs, in rupees', options: { bold: true, color: SCHEME.green, fontSize: 10.5, breakLine: true } },
      { text: '5.61 MWh, ₹13,714 over 72 h at ₹2.446/kWh. Band ₹12,518 to ₹14,880.', options: { fontSize: 9.5 } },
    ], { x: rx + 0.25 + cw3, y: cy, w: cw3, h: ch });
    card([
      { text: '31 to 40 ms', options: { bold: true, color: SCHEME.red, fontSize: 15, breakLine: true } },
      { text: 'from drop to the re-planned frame, in Chrome. Budget 150 ms. 60.1 fps.', options: { fontSize: 9.5 } },
    ], { x: rx + 0.35 + 2 * cw3, y: cy, w: cw3, h: ch });
  }

  // ========================================================== 6  feasibility
  {
    slide('Feasibility', 'FEASIBILITY AND VIABILITY', 'Round 1 section 6, continued: technical feasibility, and scalability and business viability',
      'Feasibility is argued from measurements taken on our own laptop, in Chrome, each recorded in the repository: 457 automated tests on every build; the twin at 60.1 frames a second at both 1366 by 768 and 1920 by 1080; a dropped hazard re-planned on screen in 31 to 40 milliseconds against a budget of 150; the crew plan solved in 10.8 milliseconds on the site\'s own days and cut off at 50; the detector at AP at 50 of 0.995 for cracked panels on the held-out test split of 42 images, and 0.89 on the drone\'s own frame. '
      + 'Viability. Each array is evaluated by the same pure function, so a larger plant is more rows, not a new design; we have tested to 120 arrays and claim no larger figure. '
      + 'Then the risks, said before a judge has to ask. There is no live plant behind this: telemetry for the 120 arrays is generated from the PV model with stated coefficients, temperature coefficient minus 0.0037 per degree, NOCT 45 degrees, inverter efficiency 0.98. The drone flight is a 3D simulation. '
      + 'Declared assumptions, each labelled on screen: hazard strengths; crew hours per repair, for example 3 hours for a module replacement and 1 hour for a wash; the forecast band; the 25 degree thermal span; the 65 degree threshold and 5-hour budget behind the deadline. '
      + 'The thermal classifier has no model and no metric, so no score is claimed. '
      + 'The detector is trained with Ultralytics YOLOv8, which is AGPL-3.0 and makes this repository AGPL-3.0. A commercial version would retrain on a permissively licensed detector; the README notes that switching to RF-DETR, Apache-2.0, touches one script.');
    const hw = (CW - 0.2) / 2; const rx = MX + hw + 0.2;
    const th = 2.18;
    const fi = panel('FEASIBILITY', MX, TOP, hw, th);
    const feas = [
      ['code', 'Technical:', 'it is built. 457 tests on every build, 60.1 fps, a hazard re-planned in 31 to 40 ms, detector AP@50 0.995 on a held-out split.', 'navy'],
      ['coins', 'Financial:', 'no GPU and no model server. The detector and the solver run in the browser; the one outside call is to a language model.', 'green'],
      ['desktop', 'Operational:', 'one view in any modern browser. It is built to sit beside existing SCADA: the simulator is the one part to replace.', 'purple'],
    ];
    const rh = (th - 0.6) / 3;
    feas.forEach(([ic, h, b, col], i) => iconRow(ic, h, b, MX + 0.18, fi + i * rh, hw - 0.36, rh - 0.04, { colour: col, inline: true, size: 0.36 }));
    const vi = panel('VIABILITY', rx, TOP, hw, th);
    const via = [
      ['users', 'Adoption:', 'for O&M contractors and plant owners. Nothing to install, and every figure is in MWh and in rupees at the plant’s own tariff.', 'navy'],
      ['calendar', 'Sustained:', 'a build gate of 16 invariants fails the build, not the demo, if a number drifts. The same input always gives the same site.', 'green'],
      ['puzzle', 'Grows:', 'every array is evaluated by the same function, so a larger plant is more rows, not a new design. Tested to 120 arrays.', 'purple'],
    ];
    via.forEach(([ic, h, b, col], i) => iconRow(ic, h, b, rx + 0.18, vi + i * rh, hw - 0.36, rh - 0.04, { colour: col, inline: true, size: 0.36 }));

    const by = TOP + th + 0.16; const bh = BOTTOM - by;
    const ri = panel('POTENTIAL CHALLENGES AND RISKS', MX, by, hw, bh, 'red');
    const ai = panel('HOW WE ADDRESSED THEM', rx, by, hw, bh, 'green');
    const pairs = [
      ['The telemetry is simulated, not from a real plant.', 'There is no live site behind the prototype.',
        'Every coefficient is stated', 'and the equations are NREL PVWatts. The browser model is tested against the Python on every build.'],
      ['A language model can invent a number, or be rate-limited on the day.', 'It is the one outside service we depend on.',
        'It writes words, never numbers.', 'The server recomputes every fact and rejects a reply that disagrees. Without it, the rest still works.'],
      ['The detector learned from ground-level photographs.', 'And we hold real thermal evidence for one array only.',
        'Reported per class on a held-out split,', 'and scored on the drone’s own frame: 0.89. Only B-17 is called diagnosed.'],
      ['An assumption can pass for a fact.', 'Hazard strengths, crew hours and the forecast band are ours.',
        'Each is labelled on screen as an assumption.', 'The thermal classifier is not built, so no score is claimed for it.'],
      ['A weak laptop may not hold the 3D twin.', 'A demo that stutters is worse than none.',
        'A 2D map takes over by itself', 'below 30 frames a second, on the same data. The detector’s AGPL licence is one script away from a permissive one.'],
    ];
    const ph2 = (bh - 0.62) / pairs.length;
    pairs.forEach(([rb, rt, ab, at2], i) => {
      text(runs([`${rb} `, { bold: true, bullet: { indent: 10 } }], [rt]), { x: MX + 0.2, y: ri + i * ph2, w: hw - 0.4, h: ph2 - 0.04, fontSize: 9.5, valign: 'middle' });
      text(runs([`${ab} `, { bold: true, bullet: { indent: 10 } }], [at2]), { x: rx + 0.2, y: ai + i * ph2, w: hw - 0.4, h: ph2 - 0.04, fontSize: 9.5, valign: 'middle' });
    });
  }

  // =============================================================== 7  impact
  {
    const s = slide('Impact', 'IMPACT AND BENEFITS', 'Round 1 section 5: expected impact',
      'Impact is argued from arithmetic a judge can check, not from a market statistic we cannot source. '
      + 'The tariff: Bhadla Phase-III was auctioned by SECI in 2017 as two lots, 200 MW to ACME at 2.44 and 300 MW to SBG Cleantech at 2.45 rupees per kWh. Blended by capacity that is 2.446. We never quote 2.44 alone. No deviation settlement charge is computed or claimed: the CERC formula depends on a parameter the regulation does not publish. '
      + 'One cracked array, B-17, loses 3.07 MWh over the 72-hour forecast, 7,509 rupees. '
      + 'The 30-day figure is an illustration and is labelled as one: B-17 loses 1.01 MWh a day, so 30 days is 30.3 MWh, which is 74,114 rupees. It assumes the loss stays constant, which our own prognosis says it would not: the diode is projected to fail and the strings go open. It shows why continuous matters against an annual survey. '
      + 'The chart is the cost-of-waiting table from the B-17 incident, as captured on 7 October 2026: repair now and nothing more is lost; start in 6 hours and it is 0.77 MWh, 1,894 rupees; tomorrow 1.51 MWh, 3,704 rupees; in 3 days 4.82 MWh, 11,795 rupees. The figures move with site time. All three delays are past the 14:00 deadline. This is the thing a defect report cannot give you. '
      + 'The picture under it is the Analytics screen: expected against actual for the modelled arrays over 72 hours, with the loss by cause. The modelled arrays are 178 kW short of the model now, 0.6 per cent of their output, and lose 9.66 MWh over 72 hours out of 903 expected. '
      + 'Wider benefit, stated qualitatively: more of the installed clean capacity is delivered; crews are not planned into the field above 40 degrees; and no drone is flown where imaging would add nothing.');
    const lw = 6.1; const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    const ih = 3.02;
    const ii = panel('IMPACT', MX, TOP, lw, ih);
    const imp = [
      ['search', 'Faults found as they develop, not at the next survey', 'Aerial surveys are usually yearly, so faults sit for weeks to months. This watches every array all the time.', 'navy'],
      ['clock', 'A deadline in place of an alarm', 'B-17 must be acted on before 14:00. After that the damage is projected to stop being recoverable.', 'navy'],
      ['rupee', 'Every loss priced, with its working', '3.07 MWh over 72 h is ₹7,509 at ₹2.446/kWh: the two SECI Bhadla Phase-III lots, blended by capacity.', 'navy'],
      ['chart', 'One fault, left for a month', '₹74,114: 1.01 MWh/day × 30 days. An illustration that assumes a constant loss, not a measurement.', 'navy'],
    ];
    const irh = (ih - 0.6) / imp.length;
    imp.forEach(([ic, h, b, col], i) => iconRow(ic, h, b, MX + 0.18, ii + i * irh, lw - 0.36, irh - 0.04, { colour: col }));
    const by = TOP + ih + 0.14;
    const bi = panel('BENEFITS', MX, by, lw, BOTTOM - by);
    const ben = [
      ['tools', 'Operational: the crew knows what to do first', 'A ranked list with reasons, and a day plan for two crews. No guessing which alarm matters.', 'navy'],
      ['coins', 'Economic: more energy from capacity already built', 'Loss stated in rupees at the plant’s own tariff, and no drone flown where imaging adds nothing.', 'green'],
      ['leaf', 'Environmental: more clean energy delivered', 'A plant that loses less to faults delivers more of what it was built for.', 'teal'],
      ['hat', 'Social: safer field work', 'The planner keeps crews out of the field in the hours above 40 °C.', 'purple'],
    ];
    const brh = (BOTTOM - bi - 0.1) / ben.length;
    ben.forEach(([ic, h, b, col], i) => iconRow(ic, h, b, MX + 0.18, bi + i * brh, lw - 0.36, brh - 0.04, { colour: col }));

    const ci = panel('THE COST OF WAITING: ARRAY B-17', rx, TOP, rw, BOTTOM - TOP);
    const cw = 3.55; const chh = 2.55;
    seq += 1;
    s.addChart(pres.charts.BAR, [{ name: 'Energy lost, MWh', labels: ['Repair now', 'In 6 hours', 'Tomorrow', 'In 3 days'], values: [0, 0.77, 1.51, 4.82] }], {
      x: rx + 0.12, y: ci, w: cw, h: chh, barDir: 'col', chartColors: [HEX.dk2], barGapWidthPct: 55,
      showTitle: true, title: 'Energy lost if the repair starts then (MWh)', titleFontSize: 10, titleFontFace: FONT, titleColor: HEX.dk2,
      showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 10, dataLabelFontFace: FONT, dataLabelColor: HEX.dk1, dataLabelFormatCode: '0.00',
      catAxisLabelFontSize: 9, catAxisLabelFontFace: FONT, catAxisLabelColor: HEX.dk1,
      valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false,
      objectName: `Chart ${seq}`,
    });
    cur.text.push('Native bar chart, "Energy lost if the repair starts then (MWh)": Repair now 0.00 | In 6 hours 0.77 | Tomorrow 1.51 | In 3 days 4.82');
    const tx = rx + cw + 0.25; const tw = rw - cw - 0.4;
    text([
      { text: 'Fix it now and nothing more is lost. Wait three days and it is 4.82 MWh, ₹11,795.', options: { bold: true, fontSize: 13, color: NAVY, breakLine: true, paraSpaceAfter: 6 } },
      { text: 'From the B-17 incident screen, as captured on 7 Oct 2026: ₹1,894 at 6 hours, ₹3,704 tomorrow. All three delays run past the 14:00 deadline. The figures move with site time.', options: { fontSize: 9.5, breakLine: true, paraSpaceAfter: 6 } },
      { text: 'A defect report cannot give this.', options: { fontSize: 10, bold: true, color: SCHEME.red } },
    ], { x: tx, y: ci + 0.05, w: tw, h: chh - 0.1, valign: 'middle' });
    const py = ci + chh + 0.1;
    const p = picture('07-analytics-outlook.png', rx + 0.15, py, rw - 0.3, 'right block, under the chart: the Analytics screen, expected against actual over 72 hours and the loss by cause', BOTTOM - py - 0.62);
    text('Analytics, in the prototype: expected against actual for the modelled arrays over 72 h, and the shortfall by cause. No deviation settlement charge is computed: rupees are lost energy times the tariff, and nothing else.',
      { x: rx + 0.15, y: py + p.h + 0.05, w: rw - 0.3, h: 0.46, fontSize: SMALL, bold: true, color: NAVY, align: 'center' });
  }

  // =========================================================== 8  references
  {
    slide('References', 'RESEARCH AND REFERENCES', 'Round 1 section 7: future scope (research, patent, startup); references; declaration of third-party work',
      'Future scope first. Research: finish the thermal classifier on InfraredSolarModules and report its held-out metric per class; replace the declared forecast band with an error model fitted to real forecast misses; move from 8-bit normalised thermal images to radiometric ones; validate the deadline model against real field failures. '
      + 'Patent: nothing has been filed. If we pursue one, the candidate to examine first is the method that turns a defect, its mechanism and a forecast into a repair deadline and a crew plan that re-derives live. That needs a proper novelty search before any claim. '
      + 'Startup: the natural customers are O&M contractors and asset owners of utility-scale plants; a commercial version needs a permissively licensed detector. '
      + 'OWNER TO CONFIRM: the patent and startup lines state only what the repository supports. Replace them with the team\'s actual intentions if there are any. '
      + 'The right side is the code-of-conduct declaration: every third-party library, model, dataset and external API. No personal data and no proprietary data is used. Versions are read from the installed packages. '
      + 'Credit two things out loud. The loop follows the RAISE-winning Robinsun solar agent: we rebuilt the loop, and where they had a physical drone we put a trained defect model and a physics-grounded simulation. And the thermal data is Raptor Maps\' own open dataset. '
      + 'The Turbine Logic and EPRI paper is hosted on OSTI. It is not an NREL paper.');
    const lw = 6.2; const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    const fh = 2.72;
    const fi = panel('FUTURE SCOPE', MX, TOP, lw, fh);
    const fut = [
      ['flask', 'Research:', 'finish the thermal classifier and report its held-out metric per class. Fit the forecast band to real misses. Radiometric thermal data, and field validation of the deadline model.', 'navy'],
      ['file', 'Patent:', 'none filed. Candidate for a novelty search: a defect, its mechanism and a forecast turned into a repair deadline and a crew plan that re-derives live.', 'purple'],
      ['rocket', 'Startup:', 'software for O&M contractors and owners of utility-scale plants, fed by the plant’s own SCADA. Needs a permissively licensed detector first.', 'green'],
    ];
    const frh = (fh - 0.6) / 3;
    fut.forEach(([ic, h, b, col], i) => iconRow(ic, h, b, MX + 0.18, fi + i * frh, lw - 0.36, frh - 0.04, { colour: col, inline: true, size: 0.36 }));
    const ry = TOP + fh + 0.14;
    const ri = panel('REFERENCES', MX, ry, lw, BOTTOM - ry);
    text([
      { text: '1. Sheppard, Cook, Perullo (Turbine Logic); Fregosi, Bolen (EPRI). Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation. osti.gov/servlets/purl/1960134', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '2. NREL. PVWatts Version 5 Manual, NREL/TP-6A20-60272. docs.nrel.gov/docs/fy14osti/60272.pdf', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '3. SECI auction, Bhadla Phase-III Solar Park, 2017. iea.org/policies/6373-auction-of-solar-corporation-of-india-seci; pv-magazine-india.com/?p=1613', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '4. Raptor Maps. InfraredSolarModules. github.com/RaptorMaps/InfraredSolarModules', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '5. Solar Panel Fault Detection v2, Roboflow Universe. universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '6. CERC Deviation Settlement Mechanism Regulations, 2024: context only. No charge is computed from it.' },
    ], { x: MX + 0.18, y: ri, w: lw - 0.36, h: BOTTOM - ri - 0.1, fontSize: 9 });

    const dh = 3.72;
    const di = panel('WHAT WE BUILT ON', rx, TOP, rw, dh);
    table([
      ['Kind', 'What', 'Licence'],
      ['Dataset', 'Solar Panel Fault Detection v2, Roboflow: 921 images', 'CC BY 4.0'],
      ['Dataset', 'InfraredSolarModules, Raptor Maps: 20,000 images', 'MIT'],
      ['Pre-trained model', 'Ultralytics YOLOv8n, fine-tuned by us', 'AGPL-3.0'],
      ['External API', 'Groq, model openai/gpt-oss-120b', 'Groq terms'],
      ['Libraries', 'Next.js, React, three, React Three Fiber, drei, zustand, zod, Tailwind', 'MIT'],
      ['Libraries', 'onnxruntime-web, highs (HiGHS in WebAssembly)', 'MIT'],
      ['Libraries', 'postprocessing; lucide-react; playwright-core, TypeScript', 'Zlib; ISC; Apache-2.0'],
      ['Typeface', 'IBM Plex, in the product', 'OFL'],
    ], { x: rx + 0.15, y: di, w: rw - 0.3 }, [1.3, rw - 2.95, 1.35], { fontSize: 9 });
    const cy = TOP + dh + 0.14;
    panel('', rx, cy, rw, BOTTOM - cy, 'teal');
    iconRow('shield', 'Reference we owe:', 'the loop follows the RAISE-winning Robinsun solar agent. We rebuilt it with a trained defect model and a physics-grounded simulation in place of a physical drone. No personal or proprietary data is used; telemetry is simulated.', rx + 0.18, cy + 0.14, rw - 0.36, 0.95, { colour: 'teal', inline: true, size: 0.36 });
    iconRow('users', 'Team SIGMOID:', 'Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal. Code: github.com/RAK2315/solar-proj (AGPL-3.0)', rx + 0.18, cy + 1.14, rw - 0.36, BOTTOM - cy - 1.24, { colour: 'navy', inline: true, size: 0.36 });
  }
}

// ------------------------------------------------------------------- write
(async () => {
  // The slides say which icons they use, in which colour; then those are drawn.
  build();
  await makeIcons();
  await pres.writeFile({ fileName: OUT });
  if (process.env.APPLY_THEME) {
    const { applyTheme } = require(process.env.APPLY_THEME);
    await applyTheme(OUT, THEME);
  }

  const md = [
    '# SURYA AGENT: Round 1 deck, slide by slide',
    '',
    `JSS AI FORGE 36, AI for Industry 4.0 track, team SIGMOID. ${record.length} slides, 16:9 (13.333 in by 7.5 in), light theme.`,
    '',
    'Written by `ppt/build/build_deck.cjs` together with `SURYA-AGENT-Round1.pptx`, so the two agree.',
    'Edit the script and rebuild; an edit made here alone will be overwritten.',
    '',
    'Every slide has the same frame: a "Sigmoid" mark in an outlined oval top left, the slide title centred in a',
    'black serif, "JSS AI FORGE 36 / AI for Industry 4.0" top right, and a blue footer band with the slide number.',
    'Blocks sit in heavy rounded outlines: navy by default, red for risks, green for how each is answered.',
    '',
    'For each slide: the title, which of the seven Round 1 sections it covers, every piece of text in',
    'reading order, the pictures and where each sits, and the speaker notes. A line in [SQUARE BRACKETS]',
    'is the heading of an outlined block. A line starting "(icon: name-colour)" is an icon row: the icon is',
    '`images/icons/name-colour.png`. Text is exact: do not reword a figure, round it, or add one. Where every',
    'figure comes from is in `SOURCES.md`.',
    '',
    'Pictures are in `images/`, named by slide number. All are captures of the running prototype in its',
    'light theme, taken on 7 Oct 2026 at 1920 by 1080; most are cropped so the subject can be seen.',
    'Slides 2, 4, 6 and 8 carry no picture on purpose. Slide 7 has one native chart.',
    'Fonts: Montserrat throughout, Times New Roman for the slide title.',
    '',
  ];
  for (const r of record) {
    md.push('---', '', `## Slide ${r.n}: ${r.title}`, '', `**Covers:** ${r.covers}`, '', '### Text on the slide', '');
    for (const t of r.text) md.push(t.startsWith('|') ? t : '```\n' + t + '\n```', '');
    md.push('### Pictures', '');
    if (r.pictures.length === 0) md.push('None. This slide is native shapes, text, tables and icons only.', '');
    else { for (const p of r.pictures) md.push(`- \`images/${p.file}\`: ${p.where}`); md.push(''); }
    md.push('### Speaker notes', '', r.notes, '');
  }
  fs.writeFileSync(path.join(ROOT, 'slides.md'), md.join('\n'), 'utf8');
  console.log(`${record.length} slides -> ${OUT}`);
})();
