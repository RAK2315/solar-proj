/**
 * ppt/build/build_deck.cjs — writes ppt/SURYA-AGENT-Round1.pptx and ppt/slides.md.
 *
 * One source for both, so the deck and the hand-off notes cannot drift apart:
 * every text box, table and picture placed on a slide is also recorded, and
 * slides.md is written from that record.
 *
 * Everything on a slide is native: text boxes, shapes, tables, pictures. No
 * slide is an image of a slide. Diagrams are drawn from shapes. Icons are small
 * pictures, written to ppt/images/icons/ so they can be reused.
 *
 * THE FORMAT IS THE OWNER'S, 7 Oct 2026: light, dense, a header with the team
 * mark and the event, blue section bars, framed blocks, icon rows, eight slides.
 * Text is smaller than a talk deck's on purpose: Round 1 is read, not presented.
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

const THEME = {
  name: 'Surya Light',
  headFontFace: 'Cambria',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: '111827', lt1: 'FFFFFF', dk2: '0B3C6F', lt2: 'EAF2FB',
    accent1: '1565C0', accent2: 'D9730D', accent3: 'C62828', accent4: '00796B',
    accent5: '55606F', accent6: 'F4B400', hlink: '1565C0', folHlink: '55606F',
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';                       // 13.333 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'SURYA AGENT - Round 1';
pres.author = 'Team SIGMOID';
pres.company = 'Team SIGMOID';
const C = pres.SchemeColor;
const INK = C.text1; const NAVY = C.text2; const WHITE = C.background1; const TINT = C.background2;
const BLUE = C.accent1; const ORANGE = C.accent2; const RED = C.accent3; const TEAL = C.accent4; const MUTED = C.accent5;

const W = 13.333; const MX = 0.3; const CW = W - 2 * MX;
const TOP = 1.12;                                  // first line of content
const BOTTOM = 6.98;                               // last line of content
const BODY = 11.5; const SMALL = 10;

pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: HEX.lt1 },
  objects: [
    { text: { text: 'Sigmoid', options: { shape: pres.ShapeType.roundRect, rectRadius: 0.12, x: MX, y: 0.2, w: 1.75, h: 0.62, fill: { color: HEX.dk2 }, color: 'FFFFFF', fontSize: 22, bold: true, fontFace: 'Calibri', align: 'center', valign: 'middle', margin: 0 } } },
    { text: { text: 'JSS AI FORGE 36', options: { x: W - MX - 2.5, y: 0.2, w: 2.5, h: 0.34, fontSize: 15, bold: true, color: HEX.dk2, fontFace: 'Calibri', align: 'right', valign: 'middle', margin: 0 } } },
    { text: { text: 'AI for Industry 4.0', options: { x: W - MX - 2.5, y: 0.52, w: 2.5, h: 0.3, fontSize: 12, color: HEX.accent5, fontFace: 'Calibri', align: 'right', valign: 'middle', margin: 0 } } },
    { placeholder: { options: { name: 'title', type: 'title', x: 2.3, y: 0.14, w: W - 4.6, h: 0.74, fontSize: 30, bold: true, color: NAVY, margin: 0, valign: 'middle', align: 'center' }, text: 'TITLE' } },
    { line: { x: MX, y: 0.98, w: CW, h: 0, line: { color: HEX.dk2, width: 1.25 } } },
    { rect: { x: 0, y: 7.12, w: W, h: 0.38, fill: { color: HEX.accent1 } } },
    { text: { text: 'JSS AI FORGE 36 Idea Submission  |  Team SIGMOID', options: { x: 3, y: 7.12, w: W - 6, h: 0.38, fontSize: 11, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: 'center', valign: 'middle', margin: 0 } } },
  ],
  slideNumber: { x: W - 1.0, y: 7.12, w: 0.7, h: 0.38, fontSize: 11, bold: true, color: 'FFFFFF', align: 'right', valign: 'middle' },
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
  cur.s.addText(t, { isTextBox: true, margin: 0, color: INK, fontSize: BODY, valign: 'top', objectName: `Text ${seq}`, ...o });
  if (log) cur.text.push(flat(t));
}
/** A block with text inside it: one shape, so it moves and edits as one thing. */
function card(t, o, log = true) {
  seq += 1;
  cur.s.addText(t, {
    shape: pres.ShapeType.roundRect, rectRadius: 0.05, fill: { color: TINT }, line: { color: HEX.dk2, width: 0.75 },
    margin: [5, 7, 5, 7], color: INK, fontSize: BODY, valign: 'middle', objectName: `Card ${seq}`, ...o,
  });
  if (log) cur.text.push(flat(t));
}
/** The blue bar that heads a block. */
function bar(t, x, y, w, o = {}) {
  seq += 1;
  cur.s.addText(t, {
    shape: pres.ShapeType.rect, x, y, w, h: 0.36, fill: { color: BLUE }, line: { color: HEX.accent1, width: 0 },
    color: WHITE, bold: true, fontSize: 14, margin: [1, 8, 1, 8], valign: 'middle', objectName: `Bar ${seq}`, ...o,
  });
  cur.text.push(`[${flat(t)}]`);
}
/** An outline that frames a block, drawn behind what goes in it. */
function frame(x, y, w, h) {
  seq += 1;
  cur.s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: WHITE }, line: { color: HEX.dk2, width: 1.25 }, objectName: `Frame ${seq}` });
}
function arrow(x, y, w, h, shape = pres.ShapeType.downArrow) {
  seq += 1;
  cur.s.addShape(shape, { x, y, w, h, fill: { color: NAVY }, line: { color: HEX.dk2, width: 0 }, objectName: `Arrow ${seq}` });
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
const bullets = (items, o = {}) => items.map((t, i) => ({ text: t, options: { bullet: { indent: 10 }, breakLine: i < items.length - 1, paraSpaceAfter: 3, ...o } }));

/** An icon, a bold line and a sentence under it. The icon is a picture, the rest one text box. */
function iconRow(icon, head, body, x, y, w, h, colour = NAVY) {
  seq += 1;
  cur.s.addImage({ path: path.join(ICONS, `${icon}.png`), x, y: y + 0.04, w: 0.4, h: 0.4, objectName: `Icon ${seq} ${icon}`, altText: '' });
  text([
    { text: head, options: { bold: true, fontSize: 12.5, color: colour, breakLine: true } },
    { text: body, options: { fontSize: 10.5 } },
  ], { x: x + 0.52, y, w: w - 0.52, h }, false);
  cur.text.push(`(icon: ${icon}) ${head}\n${body}`);
}

function table(rows, o, colW, { fontSize = 10.5, head = true } = {}) {
  seq += 1;
  const border = { type: 'solid', pt: 0.75, color: HEX.dk2 };
  const body = rows.map((r, ri) => r.map((cell) => {
    const c = typeof cell === 'string' ? { text: cell } : cell;
    const isHead = head && ri === 0;
    return {
      text: c.text,
      options: {
        fontSize, valign: 'middle', margin: [2, 5, 2, 5], border,
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
  solar: 'FaSolarPanel', warn: 'FaExclamationTriangle', robot: 'FaRobot', camera: 'FaCamera', eye: 'FaEye',
  clock: 'FaClock', list: 'FaListOl', user: 'FaUserCheck', calc: 'FaCalculator', sync: 'FaSyncAlt',
  rupee: 'FaRupeeSign', users: 'FaUsers', industry: 'FaIndustry', leaf: 'FaLeaf', hat: 'FaHardHat',
  flask: 'FaFlask', bulb: 'FaLightbulb', rocket: 'FaRocket', globe: 'FaGlobe', cubes: 'FaCubes',
  brain: 'FaBrain', shield: 'FaShieldAlt', scale: 'FaBalanceScale', bolt: 'FaBolt', plane: 'FaPaperPlane',
  chart: 'FaChartLine', lock: 'FaStopwatch', tools: 'FaTools', file: 'FaFileSignature',
};
async function makeIcons() {
  fs.mkdirSync(ICONS, { recursive: true });
  for (const [name, comp] of Object.entries(ICON_SET)) {
    if (!fa[comp]) throw new Error(`react-icons/fa has no ${comp}`);
    const svg = renderToStaticMarkup(React.createElement(fa[comp], { color: `#${HEX.dk2}`, size: 256 }));
    await sharp(Buffer.from(svg)).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(ICONS, `${name}.png`));
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
    const lw = 6.2;
    text('The plan, not the picture.', { x: MX, y: TOP + 0.05, w: lw, h: 0.6, fontSize: 30, bold: true, color: NAVY, fontFace: 'Cambria' });
    text('An AI agent that watches a 500 MW block of Bhadla Solar Park, sends a drone to verify what telemetry cannot, and hands the operator a ranked repair plan with a computed deadline. A person approves it before anything is scheduled.',
      { x: MX, y: TOP + 0.75, w: lw, h: 1.0, fontSize: 14 });
    table([
      [{ text: 'Event', bold: true, fill: HEX.lt2 }, 'JSS AI FORGE 36, Round 1 idea submission'],
      [{ text: 'Track', bold: true, fill: HEX.lt2 }, 'AI for Industry 4.0: predictive maintenance, automation, digital twins'],
      [{ text: 'Team', bold: true, fill: HEX.lt2 }, 'SIGMOID'],
      [{ text: 'Members', bold: true, fill: HEX.lt2 }, 'Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal'],
      [{ text: 'Prototype', bold: true, fill: HEX.lt2 }, 'Built and running. github.com/RAK2315/solar-proj'],
    ], { x: MX, y: TOP + 1.9, w: lw }, [1.2, 5.0], { fontSize: 12, head: false });
    const px = MX + lw + 0.3; const pw = CW - lw - 0.3;
    const p = picture('01-twin-field.png', px, TOP + 0.05, pw, 'right: the 3D twin of the field from the Site screen, light theme, cropped to the field');
    text('The running prototype: a 3D twin of 120 arrays. B-17 is the red one.', { x: px, y: TOP + 0.05 + p.h + 0.04, w: pw, h: 0.24, fontSize: SMALL, color: MUTED, align: 'right' });
    const stats = [
      ['364 MW', 'delivered from 500 MW nameplate, at 62.8 °C cell temperature', NAVY],
      ['−41.7 %', 'on array B-17: 5 of its 7 strings bypassed', RED],
      ['3.07 MWh', 'lost over 72 h if nobody acts before 14:00', ORANGE],
      ['0.995', 'AP@50 for cracked panels, held-out test split', TEAL],
    ];
    const sw = (CW - 0.45) / 4; const sy = BOTTOM - 1.2;
    stats.forEach(([big, small, col], i) => {
      card([
        { text: big, options: { fontSize: 26, bold: true, color: col, breakLine: true } },
        { text: small, options: { fontSize: 11 } },
      ], { x: MX + i * (sw + 0.15), y: sy, w: sw, h: 1.2 });
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
    const lw = 6.15; const rx = MX + lw + 0.25; const rw = CW - lw - 0.25;
    bar('THE PROBLEM: the plant knows its output fell, not why or how long it can wait', MX, TOP, CW);
    // Left: what telemetry says and cannot say, as a small diagram.
    const y0 = TOP + 0.5;
    frame(MX, y0, lw, 2.5);
    card('PLANT TELEMETRY (SCADA)', { x: MX + 1.6, y: y0 + 0.12, w: lw - 3.2, h: 0.4, bold: true, align: 'center', fill: { color: NAVY }, color: WHITE, fontSize: 13 });
    arrow(MX + 1.35, y0 + 0.56, 0.22, 0.26);
    arrow(MX + lw - 1.6, y0 + 0.56, 0.22, 0.26);
    card([{ text: 'What it says', options: { bold: true, color: TEAL, breakLine: true } }, { text: 'An inverter or a string is producing less than it should', options: { fontSize: 11 } }],
      { x: MX + 0.15, y: y0 + 0.86, w: 2.55, h: 0.95, align: 'center' });
    card([{ text: 'What it cannot say', options: { bold: true, color: RED, breakLine: true } }, { text: 'Which module?   Dirt or damage?   How urgent?', options: { fontSize: 11 } }],
      { x: MX + 2.85, y: y0 + 0.86, w: lw - 3.0, h: 0.95, align: 'center' });
    text('So someone drives out to look, or the fault waits for the next aerial survey. In our model, soiling and a cracked cell look the same from telemetry: only imaging separates them.',
      { x: MX + 0.15, y: y0 + 1.9, w: lw - 0.3, h: 0.55, fontSize: 11 });
    const stats = [
      ['Annual', 'usual cadence of aerial infrared inspection', NAVY],
      ['Weeks to months', 'faults below the inverter go undetected', ORANGE],
      ['−41.7 %', 'one cracked array in our model: 3.07 MWh, ₹7,509 in 72 h', RED],
    ];
    const sw = (lw - 0.2) / 3; const sy = y0 + 2.62;
    stats.forEach(([big, small, col], i) => {
      card([
        { text: big, options: { fontSize: 17, bold: true, color: col, breakLine: true } },
        { text: small, options: { fontSize: SMALL } },
      ], { x: MX + i * (sw + 0.1), y: sy, w: sw, h: 0.95, margin: [3, 5, 3, 5] });
    });
    text('Sources: first two, Turbine Logic and EPRI, osti.gov/servlets/purl/1960134. Third, our PV model at ₹2.446/kWh.', { x: MX, y: sy + 0.98, w: lw, h: 0.22, fontSize: 9, color: MUTED });
    bar('WHO BENEFITS', MX, sy + 1.24, lw, { h: 0.3, fontSize: 12 });
    const by = sy + 1.6; const bw = lw / 3;
    iconRow('tools', 'O&M crews', 'Which array, what repair, in what order, by when', MX, by, bw - 0.05, 0.7);
    iconRow('rupee', 'Asset owners', 'Loss stated in MWh and rupees at the plant’s tariff', MX + bw, by, bw - 0.05, 0.7);
    iconRow('bolt', 'Grid off-taker', 'More of the contracted energy actually delivered', MX + 2 * bw, by, bw - 0.05, 0.7);

    // Right: existing gaps, then problem against answer.
    text('EXISTING GAPS', { x: rx, y: y0, w: rw, h: 0.28, fontSize: 14, bold: true, color: NAVY });
    table([
      ['Approach', 'What it gives', 'What is still missing'],
      ['Plant SCADA', 'Output fell, at an inverter or string', 'Which module, why, how urgent'],
      ['Annual aerial infrared survey', 'A thermal map of the field', 'Flown once a year, so faults sit for weeks to months'],
      ['Drone and AI platforms (Raptor Maps, Zeitview, Sitemark)', 'Thermal imaging, AI defect classes, 3D twins under way', 'A report of defects. No deadline, no crew plan, no re-plan'],
    ], { x: rx, y: y0 + 0.32, w: rw }, [1.95, 2.1, rw - 4.05], { fontSize: SMALL });
    const ty = y0 + 2.4;
    text('FROM EACH GAP TO WHAT WE BUILT', { x: rx, y: ty, w: rw, h: 0.28, fontSize: 14, bold: true, color: NAVY });
    table([
      ['Actual problem', 'How SURYA AGENT answers it'],
      ['Faults wait for a yearly survey', 'Every array watched continuously against a physics model'],
      ['Telemetry cannot tell dirt from damage', 'A drone is sent only when imaging would add something'],
      ['A defect report has no deadline', 'A deadline computed from the defect and the 72 h forecast'],
      ['Priority is a judgement call', 'One fixed formula, with its arithmetic on screen'],
      ['A plan goes stale when the weather turns', 'The queue and the crew day re-derive live'],
      ['Automation nobody signed off', 'Nothing is scheduled until an operator approves'],
    ], { x: rx, y: ty + 0.32, w: rw }, [2.75, rw - 2.75], { fontSize: SMALL });
    text('Gaps from our prior-art sweep of 4 Oct 2026, read from each company’s public material. We do not claim the twin or the detection as new.', { x: rx, y: ty + 2.35, w: rw, h: 0.36, fontSize: 9, color: MUTED });
  }

  // ============================================================= 3  solution
  {
    slide('Solution', 'OUR SOLUTION', 'Round 1 section 3: proposed AI solution',
      'This is the product. Seven of the eight steps run without a person; the eighth is a person on purpose. The drone is not the product: it is how the agent gets evidence it cannot infer from telemetry. '
      + 'The three pictures are from the running prototype on 7 October 2026, flown at 60 times site speed. Left: drone 01 on its way to B-17. Middle: the frame the drone\'s camera returned over B-17, with the box our detector drew on it in the browser. On this flight it returned Cracked at 0.89. On the photograph the committed figure was measured on, the same weights return 0.91 against a committed 0.9084. Right: the same pass in false colour; it is a rendering of the simulated scene, not a thermal capture. '
      + 'The real thermal evidence is a UAV frame from Raptor Maps\' open dataset, processed into the panel\'s 5 by 7 cells: four hot cells in row 2, columns 3 to 6, about 2.8 degrees above the rest, one connected band. '
      + 'The detector: YOLOv8n fine-tuned on 921 images, CC BY 4.0. Cracked AP at 50 is 0.995 on the held-out test split. The language model, openai/gpt-oss-120b on Groq, writes the triage in words and never supplies a number: the server recomputes every fact and cross-checks the reply. '
      + 'The queue order is deliberately not AI. The thermal classifier is in progress: a notebook and 119 modelled frames exist, no model is trained and no score is quoted. '
      + 'Vocabulary: B-17 is diagnosed, because it has a real capture. The other 119 arrays are flagged from modelled signature. '
      + 'The loop follows the RAISE-winning Robinsun solar agent, credited on the last slide.');
    bar('PROPOSED SOLUTION: one closed loop, from a telemetry anomaly to an approved work order', MX, TOP, CW);
    const steps = ['Telemetry anomaly', 'Agent triage', 'Drone dispatch', 'Evidence capture', 'Vision analysis', 'Prognosis and deadline', 'Ranked plan', 'Human approval'];
    const sw = 1.38; const sg = (CW - 8 * sw) / 7; const ly = TOP + 0.48;
    steps.forEach((label, i) => {
      const x = MX + i * (sw + sg); const last = i === steps.length - 1;
      card([
        { text: `${i + 1}  `, options: { bold: true, color: last ? WHITE : ORANGE, fontSize: 13 } },
        { text: label, options: { bold: true, color: last ? WHITE : INK, fontSize: 11.5 } },
      ], { x, y: ly, w: sw, h: 0.62, margin: [2, 5, 2, 5], fill: { color: last ? RED : TINT } }, false);
      if (!last) arrow(x + sw + 0.03, ly + 0.22, sg - 0.06, 0.18, pres.ShapeType.rightArrow);
    });
    cur.text.push(`Loop, left to right: ${steps.map((l, i) => `${i + 1} ${l}`).join(' > ')}`);

    const py = ly + 0.78; const lw = 7.55; const pw = (lw - 0.2) / 3;
    const pics = [
      ['03-drone-in-flight.png', 'Dispatch', 'Drone 01 leaves the pad for B-17 when telemetry cannot settle the cause.', 'left: the drone in flight toward B-17'],
      ['03-drone-detection.png', 'Detection, in the browser', 'Cracked 0.89 on the frame the drone’s camera returned. The box is the model’s own.', 'middle: the drone’s camera frame over B-17 with the detector’s box'],
      ['03-thermal-pass.png', 'Thermal pass', 'The same module in false colour. A rendering of the simulated scene, not a capture.', 'right: the thermal pass over the same module'],
    ];
    let ph = 0;
    pics.forEach(([file, head, body, where], i) => {
      const x = MX + i * (pw + 0.1);
      ph = picture(file, x, py, pw, where).h;
      text([
        { text: head, options: { bold: true, color: NAVY, fontSize: 12, breakLine: true } },
        { text: body, options: { fontSize: 10.5 } },
      ], { x, y: py + ph + 0.06, w: pw, h: 0.82 });
    });
    const ny = py + ph + 0.95;
    card(runs(
      ['Measured thermal evidence: ', { bold: true, color: NAVY }],
      ['from a real UAV thermal frame (Raptor Maps, MIT), four hot cells in row 2, columns 3 to 6, about +2.8 °C, one connected band: the signature of a bypassed substring.', { breakLine: true }],
      ['Honest wording: ', { bold: true, color: RED }],
      ['B-17 is diagnosed from a real thermal capture. The other 119 arrays are flagged from modelled signature. The build fails if the two are mixed.'],
    ), { x: MX, y: ny, w: lw, h: BOTTOM - ny, fontSize: 11, valign: 'middle' });

    const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    frame(rx, py, rw, BOTTOM - py);
    text('WHERE THE AI IS', { x: rx + 0.15, y: py + 0.08, w: rw - 0.3, h: 0.3, fontSize: 14, bold: true, color: NAVY });
    const rows = [
      ['eye', 'Vision detector, trained by us', 'YOLOv8n fine-tuned on 921 labelled photographs. Cracked AP@50 0.995, held-out test split. Runs in the browser: no server, no GPU.'],
      ['robot', 'Agent reasoning, a language model', 'openai/gpt-oss-120b on Groq writes the triage in words. It never supplies a number: the server recomputes every fact and cross-checks.'],
      ['clock', 'Prognosis that ends in an hour', 'A thermal-dose model and the 72 h forecast give "act before 14:00". Computed, never looked up.'],
      ['calc', 'Crew plan, exact optimisation', 'A mixed-integer program solved by HiGHS in WebAssembly, capped at 50 ms, beside a heuristic scored the same way.'],
    ];
    const rh = 0.78;
    rows.forEach(([ic, h, b], i) => iconRow(ic, h, b, rx + 0.15, py + 0.45 + i * rh, rw - 0.3, rh - 0.04));
    const qy = py + 0.45 + 4 * rh + 0.02;
    card(runs(
      ['Not AI, on purpose: ', { bold: true, color: NAVY }],
      ['the queue order is a fixed formula, never a model’s opinion.', { breakLine: true }],
      ['In progress, no result claimed: ', { bold: true, color: RED }],
      ['a thermal classifier on Raptor Maps’ InfraredSolarModules. No model is trained and no metric is quoted.'],
    ), { x: rx + 0.15, y: qy, w: rw - 0.3, h: BOTTOM - qy - 0.12, fontSize: 10.5 });
  }

  // ================================================================= 4  tech
  {
    slide('Technology', 'TECH STACK AND FLOW', 'Round 1 section 6: prototype architecture',
      'Read the left side top to bottom. Before the build: Python scripts hold the PV model and generate the site and its telemetry; a Colab notebook trained the detector and exported it to ONNX; an image-processing script turned a real thermal frame into the cell grid. '
      + 'The build gate runs in order: validate every data file against its Zod schema and 16 invariants, scan the source for hardcoded numbers and forbidden wording, run 453 tests, then compile. The TypeScript physics is golden-tested against the Python. If a headline figure moves, the build fails, not the demo. '
      + 'At run time, in the browser, there is one clock, the site time. Everything on screen is a pure function of that clock and the scenario events, which is why you can seek backwards and a dropped hazard un-happens. '
      + 'The detector and the solver both run as WebAssembly on the operator\'s machine. There is exactly one network call: the triage route, which calls Groq and cross-checks the reply against the physics on the server. There is no database. A work order is created only by the operator\'s click. '
      + 'On the choices: we refused a second service because a cold start on stage is a demo failure, so the solver is HiGHS compiled to WebAssembly and not OR-Tools behind a Python server. '
      + 'This diagram is drawn from native shapes so it can be edited.');
    const lw = 7.75; const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    frame(MX, TOP, lw, BOTTOM - TOP);
    text('A physics model, a trained detector and an exact solver, all running in the browser behind a build that fails if a number drifts.',
      { x: MX + 0.15, y: TOP + 0.06, w: lw - 0.3, h: 0.42, fontSize: 11.5, bold: true, color: NAVY });
    const lab = 1.2; const gx = MX + 0.15 + lab; const gw = lw - 0.3 - lab;
    const label = (t, y, h) => text(t, { x: MX + 0.15, y, w: lab - 0.1, h, fontSize: 11, bold: true, color: NAVY, valign: 'middle' }, false);
    const chip = (t, x, y, w, h, o = {}) => card(t, { x, y, w, h, fontSize: 10.5, align: 'center', margin: [2, 4, 2, 4], ...o }, false);
    // Row 1: before the build.
    let y = TOP + 0.55;
    label('BEFORE THE BUILD', y, 0.72);
    const r1 = ['PV model and data generators\nPython', 'Detector training\nYOLOv8n to ONNX, Colab', 'Thermal cell grid\nclassical image processing'];
    const w3 = (gw - 0.2) / 3;
    r1.forEach((t, i) => chip(t, gx + i * (w3 + 0.1), y, w3, 0.72));
    arrow(gx + gw / 2 - 0.13, y + 0.75, 0.26, 0.2);
    // Row 2: the gate.
    y += 0.98;
    label('BUILD GATE', y, 0.55);
    chip('Zod schemas and 16 invariants   >   scan for hardcoded numbers and wording   >   453 tests, physics golden-tested against Python   >   compile',
      gx, y, gw, 0.55, { fill: { color: NAVY }, color: WHITE, bold: true });
    arrow(gx + gw / 2 - 0.13, y + 0.58, 0.26, 0.2);
    // Row 3: the browser.
    y += 0.81;
    label('IN THE BROWSER', y, 1.95);
    chip('ONE CLOCK: site time. Every screen is a pure function of it and the scenario events', gx, y, gw, 0.4, { fill: { color: C.accent6 }, bold: true });
    const grid = ['PV model per array\nplus dropped hazards', 'Ranked queue\none fixed formula', 'Crew plan\nHiGHS in WebAssembly', 'Detector\nONNX Runtime Web', '3D twin\nReact Three Fiber', 'Glass overlay\nsix screens, 2D fallback'];
    grid.forEach((t, i) => chip(t, gx + (i % 3) * (w3 + 0.1), y + 0.5 + Math.floor(i / 3) * 0.74, w3, 0.66));
    arrow(gx + gw / 4 - 0.13, y + 1.98, 0.26, 0.2);
    arrow(gx + (3 * gw) / 4 - 0.13, y + 1.98, 0.26, 0.2);
    // Row 4: out of the browser.
    y += 2.21;
    label('WHAT LEAVES IT', y, BOTTOM - y - 0.12);
    const w2 = (gw - 0.1) / 2; const h4 = BOTTOM - y - 0.12;
    chip([{ text: 'ONE NETWORK CALL', options: { bold: true, color: TEAL, breakLine: true } }, { text: '/api/triage to Groq. The server recomputes the facts and cross-checks the reply' }], gx, y, w2, h4);
    chip([{ text: 'THE OPERATOR', options: { bold: true, color: WHITE, breakLine: true } }, { text: 'approves or declines. Only then does a work order exist', options: { color: WHITE } }], gx + w2 + 0.1, y, w2, h4, { fill: { color: RED } });
    cur.text.push('Flow diagram, top to bottom, with a label at the left of each row:');
    cur.text.push(`BEFORE THE BUILD: ${r1.map((t) => t.replace('\n', ', ')).join(' | ')}`);
    cur.text.push('BUILD GATE: Zod schemas and 16 invariants > scan for hardcoded numbers and wording > 453 tests, physics golden-tested against Python > compile');
    cur.text.push(`IN THE BROWSER: ONE CLOCK: site time. Every screen is a pure function of it and the scenario events | ${grid.map((t) => t.replace('\n', ', ')).join(' | ')}`);
    cur.text.push('WHAT LEAVES IT: ONE NETWORK CALL, /api/triage to Groq. The server recomputes the facts and cross-checks the reply | THE OPERATOR approves or declines. Only then does a work order exist');

    bar('TECHNOLOGY STACK', rx, TOP, rw);
    table([
      [{ text: 'Frontend', bold: true, fill: HEX.lt2 }, 'Next.js 15, React 19, TypeScript'],
      [{ text: '3D twin', bold: true, fill: HEX.lt2 }, 'three.js, React Three Fiber'],
      [{ text: 'Vision', bold: true, fill: HEX.lt2 }, 'YOLOv8n, run on ONNX Runtime Web'],
      [{ text: 'Optimiser', bold: true, fill: HEX.lt2 }, 'HiGHS, compiled to WebAssembly'],
      [{ text: 'Agent', bold: true, fill: HEX.lt2 }, 'openai/gpt-oss-120b on Groq'],
      [{ text: 'State, schema', bold: true, fill: HEX.lt2 }, 'Zustand, Zod'],
      [{ text: 'Offline', bold: true, fill: HEX.lt2 }, 'Python; training on a Colab T4'],
    ], { x: rx, y: TOP + 0.42, w: rw }, [1.35, rw - 1.35], { fontSize: 11, head: false });
    const wy = TOP + 2.75;
    bar('WHY THESE CHOICES', rx, wy, rw);
    const why = [
      ['globe', 'Everything in the browser', 'No GPU and no model server, so nothing can cold-start in front of a judge.'],
      ['scale', 'An exact solver beside a heuristic', 'A new rule is one line of a model, and the answer is provable. Both scores are shown.'],
      ['shield', 'The model writes words, not numbers', 'Every figure comes from the physics and is cross-checked on the server.'],
      ['sync', 'One clock', 'Seek backwards and every screen is correct. The same input gives the same site.'],
    ];
    const wh = (BOTTOM - wy - 0.44) / 4;
    why.forEach(([ic, h, b], i) => iconRow(ic, h, b, rx + 0.05, wy + 0.44 + i * wh, rw - 0.1, wh - 0.04));
  }

  // ================================================================== 5  usp
  {
    slide('USP', 'OUR USP', 'Round 1 section 4: innovation and uniqueness',
      'Our difference is deliberately not the twin and not the detection. It is what happens after the picture: a deadline, a plan that re-derives, the arithmetic, and a human gate. '
      + 'The left picture is the Queue screen. Every job prints its own working. At the moment captured, B-17 reads 1.01 MWh a day, times 3.0 for critical, times 7.69 urgency, divided by 1.0 access, equals 23.29. Urgency is 1 plus 24 over the hours left, so the score rises as the deadline closes and reads differently at a different minute. If a judge asks how it prioritises, open src/lib/ranking.ts. '
      + 'The right picture is the live demonstration. A judge names a hazard; we drag it onto the field. Here a dust storm was dropped over part of Zone B. The screen reads: 8 arrays affected, 6 jobs added, 1 displaced, B-17 still first. Over the next 72 hours the dust costs the modelled arrays 5.61 MWh, 13,714 rupees at 2.446 rupees per kWh, forecast band 12,518 to 14,880. '
      + 'Measured in Chrome on our laptop: from releasing the pointer to the re-planned frame being painted takes 31 to 40 milliseconds against a budget of 150, and the twin holds 60.1 frames a second. '
      + 'Be straight about three things. The hazard strengths are declared assumptions; none is a measurement of Bhadla. The forecast band is a declared plus or minus 5 to 15 per cent on irradiance, not a fitted error model. And at this moment the heuristic matched the optimum; we do not claim the solver beats it here. A 5.8 per cent difference does exist on one ordinary afternoon, 14:17 site time.');
    bar('THE PLAN, NOT THE PICTURE: others detect and report. We hand over a deadline and a plan', MX, TOP, CW);
    const lw = 4.55; const y0 = TOP + 0.5;
    frame(MX, y0, lw, BOTTOM - y0);
    text('FOUR THINGS A DEFECT REPORT DOES NOT GIVE', { x: MX + 0.15, y: y0 + 0.08, w: lw - 0.3, h: 0.3, fontSize: 12.5, bold: true, color: NAVY });
    const usp = [
      ['clock', 'A computed deadline', 'Not a flagged defect: an hour, worked out from the defect, its mechanism and the 72 h forecast.'],
      ['sync', 'A plan that re-derives live', 'Change the conditions and the queue, the deadlines and the crew day are worked out again.'],
      ['calc', 'Arithmetic on screen', 'The ranking formula with its inputs, and a ? on every number for where it came from.'],
      ['user', 'A human gate', 'The agent proposes. Only an operator’s click creates a work order.'],
    ];
    const uh = 0.86;
    usp.forEach(([ic, h, b], i) => iconRow(ic, h, b, MX + 0.15, y0 + 0.45 + i * uh, lw - 0.3, uh - 0.04));
    const fy = y0 + 0.45 + 4 * uh + 0.02;
    card([
      { text: 'score = loss per day × severity × urgency ÷ access', options: { bold: true, color: NAVY, fontSize: 12.5, breakLine: true } },
      { text: 'B-17 as captured: 1.01 MWh × 3.0 × 7.69 ÷ 1.0 = 23.29', options: { fontSize: 11.5, bold: true, color: RED, breakLine: true } },
      { text: 'Urgency is 1 + 24 ÷ hours left, so the score climbs as the deadline closes. Next is A-08 at 0.81.', options: { fontSize: 10.5 } },
    ], { x: MX + 0.15, y: fy, w: lw - 0.3, h: BOTTOM - fy - 0.12 });

    const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    const qw = 3.2;
    const q = picture('05-queue-arithmetic.png', rx, y0, qw, 'middle: the repair queue on the Queue screen, each job with its arithmetic');
    text('Every job shows its working.', { x: rx, y: y0 + q.h + 0.04, w: qw, h: 0.22, fontSize: SMALL, color: MUTED });
    const sx = rx + qw + 0.15; const swid = rw - qw - 0.15;
    const s5 = picture('05-sandbox-hazard.png', sx, y0, swid, 'right: the Sandbox screen after a dust storm was dropped on Zone B');
    text('What-if sandbox: a dust storm dropped on Zone B.', { x: sx, y: y0 + s5.h + 0.04, w: swid, h: 0.22, fontSize: SMALL, color: MUTED });
    const by = y0 + Math.max(q.h, s5.h) + 0.34;
    bar('THE LIVE DEMONSTRATION: name a hazard, drag it onto the field, the plan re-derives', rx, by, rw, { h: 0.32, fontSize: 12 });
    const cy = by + 0.4; const cw3 = (rw - 0.2) / 3; const ch = BOTTOM - cy;
    card([
      { text: 'What the screen said', options: { bold: true, color: NAVY, fontSize: 12, breakLine: true } },
      { text: '8 arrays affected, 6 jobs added, 1 displaced, B-17 still first.', options: { fontSize: 10.5 } },
    ], { x: rx, y: cy, w: cw3, h: ch });
    card([
      { text: 'What it costs, in rupees', options: { bold: true, color: NAVY, fontSize: 12, breakLine: true } },
      { text: '5.61 MWh, ₹13,714 over 72 h at ₹2.446/kWh. Band ₹12,518 to ₹14,880.', options: { fontSize: 10.5 } },
    ], { x: rx + cw3 + 0.1, y: cy, w: cw3, h: ch });
    card([
      { text: '31 to 40 ms', options: { bold: true, color: RED, fontSize: 17, breakLine: true } },
      { text: 'from drop to the re-planned frame, measured in Chrome. Budget 150 ms. 60.1 fps.', options: { fontSize: 10.5 } },
    ], { x: rx + 2 * (cw3 + 0.1), y: cy, w: cw3, h: ch });
  }

  // ========================================================== 6  feasibility
  {
    slide('Feasibility', 'FEASIBILITY AND VIABILITY', 'Round 1 section 6, continued: technical feasibility, and scalability and business viability',
      'Every row of the table is a measurement taken on our own laptop, in Chrome, and each is recorded in the repository. '
      + 'The frame rate and the drop-to-re-plan time come from a script that drives a real pointer in a real Chrome window on the real GPU. The solver times are for the site\'s own days; two synthetic stress days took 60 to 170 ms, which is why the solve is cut off at 50 ms and then reports "best plan found" with its gap and is never called optimal. '
      + 'The detector figure is per class on the held-out test split of 42 images. '
      + 'Then say what is real and what is not, before a judge has to ask. There is no live plant behind this: telemetry for the 120 arrays is generated from the PV model with stated coefficients, temperature coefficient minus 0.0037 per degree, NOCT 45 degrees, inverter efficiency 0.98. The drone flight is a 3D simulation. '
      + 'Declared assumptions, each labelled on screen: hazard strengths; crew hours per repair, for example 3 hours for a module replacement and 1 hour for a wash; the forecast band; the 25 degree thermal span; the 65 degree threshold and 5-hour budget behind the deadline. '
      + 'Not built: the thermal classifier has no model and no metric, and nothing is connected to a real SCADA system or drone. '
      + 'Viability. Each array is evaluated by the same pure function, so a larger plant is more rows, not a new design; we have tested to 120 arrays and claim no larger figure. '
      + 'One practical point for a product: the detector is trained with Ultralytics YOLOv8, which is AGPL-3.0 and makes this repository AGPL-3.0. A commercial version would retrain on a permissively licensed detector; the README notes that switching to RF-DETR, Apache-2.0, touches one script.');
    const lw = 6.9; const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    bar('FEASIBILITY: it is built, and these are measurements, not targets', MX, TOP, lw);
    table([
      ['What', 'Result', 'How it was measured'],
      ['Automated tests', '453 passing', 'Every build, before it compiles'],
      ['3D twin frame rate', '60.1 fps, no frame over 20 ms', 'Chrome at 1366×768 and 1920×1080'],
      ['Hazard drop to re-planned frame', '31 to 40 ms', 'Real pointer, Chrome. Budget 150 ms'],
      ['Crew-plan solve, the site’s own days', '10.8 ms; 1.1 ms in a heatwave', 'HiGHS, WebAssembly. Cut off at 50 ms'],
      ['Detector, class Cracked', 'AP@50 0.995', 'Held-out test split, 42 images'],
      ['Detector on the drone’s own frame', 'Cracked 0.89', 'Real-time flight of B-17, in browser'],
      ['Physics in the browser', 'Matches the Python model', 'Golden test, on every build'],
    ], { x: MX, y: TOP + 0.42, w: lw }, [2.45, 1.95, lw - 4.4], { fontSize: 10 });
    const vy = TOP + 2.35;
    bar('VIABILITY: how far it can go', MX, vy, lw);
    const via = [
      ['cubes', 'Scales by design', 'Every array is evaluated by the same function: a larger plant is more rows, not a new design. Tested to 120 arrays; no larger figure claimed.'],
      ['globe', 'Nothing to host per site', 'The reasoning runs in the browser, so a new site needs no new server. The simulator is the one part to replace, with the plant’s own SCADA feed.'],
      ['industry', 'A route to a product', 'Likely users are O&M contractors and plant owners. Commercial use needs a permissively licensed detector: today’s is AGPL-3.0 through Ultralytics.'],
    ];
    const vh = (BOTTOM - vy - 0.44) / 3;
    via.forEach(([ic, h, b], i) => iconRow(ic, h, b, MX + 0.05, vy + 0.44 + i * vh, lw - 0.1, vh - 0.04));

    bar('WHAT IS REAL, AND WHAT IS NOT', rx, TOP, rw);
    const cells = [
      ['Real', TEAL, ['Detector trained by us, measured on a held-out split', 'Thermal band measured from a real UAV frame', 'Tariffs as awarded by SECI', 'PV equations from NREL PVWatts']],
      ['Simulated', NAVY, ['Telemetry for all 120 arrays, from the PV model with stated coefficients', 'The drone flight, in the 3D scene', 'The 72 h weather forecast']],
      ['Declared assumption', ORANGE, ['Hazard strengths in the sandbox', 'Crew hours for each kind of repair', 'Forecast band, ±5 % widening to ±15 %', 'Thermal span and the dose threshold behind the deadline']],
      ['Not built', RED, ['Thermal classifier: no model, no metric', 'Connection to a real SCADA system or drone', 'Any deviation settlement charge']],
    ];
    const gy = TOP + 0.44; const gw = (rw - 0.1) / 2; const gh = (BOTTOM - gy - 0.75) / 2;
    cells.forEach(([h, col, items], i) => {
      card([
        { text: h, options: { bold: true, color: col, fontSize: 13, breakLine: true, paraSpaceAfter: 3 } },
        ...bullets(items, { fontSize: 10.5 }),
      ], { x: rx + (i % 2) * (gw + 0.1), y: gy + Math.floor(i / 2) * (gh + 0.1), w: gw, h: gh, valign: 'top', fill: { color: WHITE } });
    });
    card(runs(
      ['Evidence stays with the array it was captured on. ', { bold: true, color: NAVY }],
      ['We hold real imagery for B-17 only, and no other array may show it.'],
    ), { x: rx, y: BOTTOM - 0.55, w: rw, h: 0.55, fontSize: 10.5 });
  }

  // =============================================================== 7  impact
  {
    slide('Impact', 'IMPACT AND BENEFITS', 'Round 1 section 5: expected impact',
      'Impact is argued from arithmetic a judge can check, not from a market statistic we cannot source. '
      + 'The tariff: Bhadla Phase-III was auctioned by SECI in 2017 as two lots, 200 MW to ACME at 2.44 and 300 MW to SBG Cleantech at 2.45 rupees per kWh. Blended by capacity that is 2.446. We never quote 2.44 alone. No deviation settlement charge is computed or claimed: the CERC formula depends on a parameter the regulation does not publish. '
      + 'One cracked array, B-17, loses 3.07 MWh over the 72-hour forecast, 7,509 rupees. '
      + 'The 30-day figure is an illustration and is labelled as one: B-17 loses 1.01 MWh a day, so 30 days is 30.3 MWh, which is 74,114 rupees. It assumes the loss stays constant, which our own prognosis says it would not: the diode is projected to fail and the strings go open. It shows why continuous matters against an annual survey. '
      + 'The picture is the cost-of-waiting table from the B-17 incident: repair now, in 6 hours, tomorrow or in 3 days, each with the energy and the rupees lost. Its figures are as captured and move with site time. This is the thing a detector cannot give you. '
      + 'Wider benefit, stated qualitatively: more of the installed clean capacity is delivered; crews are not planned into the field above 40 degrees; and no drone is flown where imaging would add nothing, for example a soiled array. '
      + 'On the Analytics screen, the modelled arrays are 178 kW short of the model now, 0.6 per cent of their output, and lose 9.66 MWh over 72 hours out of 903 expected.');
    bar('WHAT A FAULT COSTS, AND WHAT WAITING COSTS: every figure with its working', MX, TOP, CW);
    const stats = [
      ['₹2.446/kWh', '(200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW. The two SECI Bhadla Phase-III lots, blended by capacity', NAVY],
      ['3.07 MWh  =  ₹7,509', 'what one cracked array, B-17, loses over the 72 h forecast if nobody acts', RED],
      ['₹74,114', 'the same array left 30 days: 1.01 MWh/day × 30. An illustration that assumes a constant loss, not a measurement', ORANGE],
      ['Annual  >  continuous', 'aerial surveys are usually yearly, so faults sit for weeks to months. This watches every array all the time', TEAL],
    ];
    const sw = (CW - 0.3) / 4; const sy = TOP + 0.48;
    stats.forEach(([big, small, col], i) => {
      card([
        { text: big, options: { fontSize: 19, bold: true, color: col, breakLine: true } },
        { text: small, options: { fontSize: 10.5 } },
      ], { x: MX + i * (sw + 0.1), y: sy, w: sw, h: 1.38 });
    });
    const y1 = sy + 1.55; const lw = 4.7;
    frame(MX, y1, lw, BOTTOM - y1);
    text('THE COST OF WAITING, ON SCREEN', { x: MX + 0.15, y: y1 + 0.08, w: lw - 0.3, h: 0.28, fontSize: 12.5, bold: true, color: NAVY });
    const p = picture('07-cost-of-waiting.png', MX + 0.15, y1 + 0.42, lw - 0.3, 'lower left: the cost-of-waiting table from the B-17 incident screen');
    text('From the B-17 incident: repair now, in 6 h, tomorrow or in 3 days, in MWh and rupees. As captured; the figures move with site time. A defect report cannot give this.',
      { x: MX + 0.15, y: y1 + 0.42 + p.h + 0.08, w: lw - 0.3, h: 0.75, fontSize: 10.5 });
    const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    bar('WHO GAINS, AND HOW', rx, y1, rw, { h: 0.32, fontSize: 12.5 });
    const ben = [
      ['tools', 'Operators and O&M crews', 'A ranked list with reasons: which array, what repair, by when. No guessing which alarm matters.'],
      ['rupee', 'Asset owners', 'Loss in MWh and in rupees at the plant’s own tariff, with the source shown.'],
      ['bolt', 'The grid and its off-taker', 'More of the contracted clean energy actually delivered from capacity already built.'],
      ['hat', 'Crew safety', 'The planner keeps field work out of the hours above 40 °C.'],
      ['plane', 'Fewer needless flights', 'No drone is sent where imaging adds nothing, such as a soiled array.'],
      ['industry', 'Industry 4.0, end to end', 'A digital twin, predictive maintenance and automation, with a person in the loop.'],
    ];
    const bw = (rw - 0.15) / 2; const bh = (BOTTOM - y1 - 0.42 - 0.34) / 3;
    ben.forEach(([ic, h, b], i) => iconRow(ic, h, b, rx + (i % 2) * (bw + 0.15), y1 + 0.42 + Math.floor(i / 2) * bh, bw, bh - 0.04));
    text('No deviation settlement charge is computed or claimed. Rupees are lost energy times the tariff, and nothing else.', { x: rx, y: BOTTOM - 0.28, w: rw, h: 0.28, fontSize: 10, color: MUTED });
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
    const lw = 6.3; const rx = MX + lw + 0.2; const rw = CW - lw - 0.2;
    bar('FUTURE SCOPE: research, patent, startup', MX, TOP, lw);
    const fut = [
      ['flask', 'Research', 'Finish the thermal classifier and report its held-out metric per class. Fit the forecast band to real forecast misses. Radiometric thermal data, and field validation of the deadline model.'],
      ['file', 'Patent', 'None filed. Candidate for a novelty search: a defect, its mechanism and a forecast turned into a repair deadline and a crew plan that re-derives live.'],
      ['rocket', 'Startup', 'Software for O&M contractors and owners of utility-scale plants, fed by the plant’s own SCADA. Needs a permissively licensed detector first.'],
    ];
    const fh = 0.86;
    fut.forEach(([ic, h, b], i) => iconRow(ic, h, b, MX + 0.05, TOP + 0.44 + i * fh, lw - 0.1, fh - 0.04));
    const ry = TOP + 0.44 + 3 * fh + 0.04;
    bar('REFERENCES', MX, ry, lw);
    text([
      { text: '1. Sheppard, Cook, Perullo (Turbine Logic); Fregosi, Bolen (EPRI). Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation. osti.gov/servlets/purl/1960134', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '2. NREL. PVWatts Version 5 Manual, NREL/TP-6A20-60272. docs.nrel.gov/docs/fy14osti/60272.pdf', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '3. SECI auction, Bhadla Phase-III Solar Park, 2017. iea.org/policies/6373-auction-of-solar-corporation-of-india-seci and pv-magazine-india.com/?p=1613', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '4. Raptor Maps. InfraredSolarModules dataset. github.com/RaptorMaps/InfraredSolarModules', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '5. Solar Panel Fault Detection v2, Roboflow Universe. universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection', options: { breakLine: true, paraSpaceAfter: 3 } },
      { text: '6. CERC Deviation Settlement Mechanism Regulations, 2024: cited as context only. No charge is computed from it.' },
    ], { x: MX + 0.05, y: ry + 0.44, w: lw - 0.1, h: BOTTOM - ry - 0.44, fontSize: 10.5 });

    bar('WHAT WE BUILT ON: third-party work, declared', rx, TOP, rw);
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
    ], { x: rx, y: TOP + 0.42, w: rw }, [1.35, rw - 2.85, 1.5], { fontSize: SMALL });
    const cy = TOP + 2.9;
    card(runs(
      ['Reference we owe: ', { bold: true, color: NAVY }],
      ['the loop follows the RAISE-winning Robinsun solar agent. We rebuilt it with a trained defect model and a physics-grounded simulation in place of a physical drone.', { breakLine: true }],
      ['Data: ', { bold: true, color: NAVY }],
      ['no personal or proprietary data is used. Both datasets are public and openly licensed. Telemetry is simulated.'],
    ), { x: rx, y: cy, w: rw, h: 1.3, fontSize: 11 });
    card([
      { text: 'Team SIGMOID', options: { bold: true, color: NAVY, fontSize: 13, breakLine: true } },
      { text: 'Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal', options: { fontSize: 11, breakLine: true } },
      { text: 'Code: github.com/RAK2315/solar-proj (AGPL-3.0)', options: { fontSize: 10.5, color: MUTED } },
    ], { x: rx, y: cy + 1.4, w: rw, h: BOTTOM - cy - 1.4 });
  }
}

// ------------------------------------------------------------------- write
(async () => {
  await makeIcons();
  build();
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
    'Every slide has the same frame: a "Sigmoid" mark top left, the slide title centred, "JSS AI FORGE 36 /',
    'AI for Industry 4.0" top right, a rule under them, and a blue footer band with the slide number.',
    '',
    'For each slide: the title, which of the seven Round 1 sections it covers, every piece of text in',
    'reading order, the pictures and where each sits, and the speaker notes. A line in [SQUARE BRACKETS]',
    'is a blue section bar. A line starting "(icon: name)" is an icon row: the icon is',
    '`images/icons/name.png`. Text is exact: do not reword a figure, round it, or add one. Where every',
    'figure comes from is in `SOURCES.md`.',
    '',
    'Pictures are in `images/`, named by slide number. All are captures of the running prototype in its',
    'light theme, taken on 7 Oct 2026 at 1920 by 1080; most are cropped so the subject can be seen.',
    'Slides 2, 4, 6 and 8 carry no picture on purpose.',
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
