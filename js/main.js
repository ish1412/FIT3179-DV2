// Same Test, Different Starting Lines: chart loader
// Embeds every Vega-Lite spec and wires up the shared Domain / Year level selector
// and the C5 → C7 state highlight.

// One spec per chart. When the Domain dropdown is set to "Average of subjects", the
// single-subject charts show the simple average of the five subjects (each spec
// handles this itself). C2 is the exception: it swaps between one big panel for
// the selected subject ("one") and five small panels for "Average of subjects" ("all").
const SPECS = {
  c01: { one: "js/specs/c01_waffle.vl.json" },
  c02: { one: "js/specs/c02_trend_focus.vl.json", all: "js/specs/c02_trend_small_multiples.vl.json" },
  c03: { one: "js/specs/c03_diverging_proficiency.vl.json" },
  c04: { one: "js/specs/c04_change_heatmap.vl.json" },
  c05: { one: "js/specs/c05_state_choropleth.vl.json" },
  c06: { one: "js/specs/c06_tile_grid.vl.json" },
  c07: { one: "js/specs/c07_bump_rank.vl.json" },
  c08: { one: "js/specs/c08_c09_c10_postcode.vl.json" }, // C8 school map + C9 violin + C10 remoteness map
  c11: { one: "js/specs/c11_dumbbell_indigenous.vl.json" },
  c12: { one: "js/specs/c12_marimekko_parent_ed.vl.json" },
  c13: { one: "js/specs/c13_butterfly_gender.vl.json" },
  c14: { one: "js/specs/c14_cohort.vl.json" }
};

// Shared look for every chart
// Same family as the page CSS (--font-body / --font-head)
const FONT = "Arial, Helvetica, sans-serif";
const HEAD = FONT;
const INK = "#2B2A28";
const SOFT = "#6B675F";

const CONFIG = {
  background: "#FBF8F1",
  font: FONT,
  padding: 4,
  view: { stroke: null },
  title: {
    font: HEAD,
    fontSize: 17,
    fontWeight: "bold",
    color: INK,
    anchor: "start",
    offset: 10,
    subtitleFont: FONT,
    subtitleFontSize: 12,
    subtitleColor: SOFT,
    subtitlePadding: 4
  },
  axis: {
    labelFont: FONT,
    titleFont: FONT,
    labelFontSize: 11,
    titleFontSize: 12,
    titleFontWeight: "normal",
    labelColor: SOFT,
    titleColor: INK,
    gridColor: "#ECE6DA",
    domainColor: "#BDB6A8",
    tickColor: "#BDB6A8"
  },
  legend: {
    labelFont: FONT,
    titleFont: FONT,
    labelFontSize: 11,
    titleFontSize: 12,
    titleFontWeight: "normal",
    labelColor: INK,
    titleColor: INK
  },
  header: { labelFont: FONT, titleFont: FONT, labelColor: INK },
  text: { font: FONT, color: INK }
};

const EMBED_OPTS = { actions: false, config: CONFIG };

// ---------------------------------------------------------------------------
// Per-page size overrides.
// The specs in js/specs are sized for three_col.html (12-column grid).
// A page can set <body data-layout="..."> to resize charts for its own layout
// without touching the spec files. "container" = fill the chart's column.
// ---------------------------------------------------------------------------
const LAYOUT = document.body.dataset.layout || "grid";

const findLayer = (layers, test) => layers.find(test) || {};

// Keys are chart ids; "c02_all" resizes C2's five-panel "Average of subjects" version.
const LAYOUT_PATCHES = {
  "two-column": {
    // C2: one big panel for the selected subject, or five panels for "Average of subjects"
    c02: (s) => { s.width = 980; s.height = 360; },
    c02_all: (s) => { s.spec.width = 185; s.spec.height = 270; },

    // C3 diverging bars: fill the column
    c03: (s) => { s.width = "container"; s.height = 440; },

    // C4 heatmap: fill the column, bigger labels and legend
    c04: (s) => {
      s.width = "container";
      s.height = 380;
      s.layer[0].encoding.color.legend.gradientLength = 280;
      s.layer[1].mark.fontSize = 14;
    },

    // C6 tile grid: bigger tiles (C7 sits underneath in the HTML)
    c06: (s) => {
      const w = 118, h = 80;
      s.spec.width = w;
      s.spec.height = h;
      findLayer(s.spec.layer, (l) => l.mark.type === "rect").encoding.y2.value = h;
      findLayer(s.spec.layer, (l) => l.mark.type === "text").mark.fontSize = 12;
      // leave room above the line for the "WA 68" label
      s.spec.layer.filter((l) => l.encoding && l.encoding.y && l.encoding.y.scale).forEach((l) => { l.encoding.y.scale.padding = 4; l.encoding.y.scale.range = [h - 6, 24]; });
    },

    // C7 bump chart: fill the column under the tiles
    c07: (s) => {
      s.width = "container";
      s.height = 230;
      findLayer(s.layer, (l) => l.data && l.data.values).encoding.y.value = 230 + 26;
    },

    // C8 school map full width on top; C9 violin + C10 remoteness map side by side below
    c08: (s) => {
      const [schoolMap, rightCol] = s.hconcat;
      const [violin, remoteMap] = rightCol.vconcat;

      schoolMap.width = 1000;
      schoolMap.height = 820;
      const dots = findLayer(schoolMap.layer, (l) => l.mark.type === "circle");
      dots.encoding.size.scale.range = [20, 1000];
      dots.mark.opacity = 0.6;

      violin.spec.width = 420;
      violin.spec.height = 46;

      remoteMap.width = 500;
      remoteMap.height = 440;
      findLayer(remoteMap.layer, (l) => l.encoding).encoding.color.legend.gradientLength = 260;

      delete s.hconcat;
      s.vconcat = [schoolMap, { hconcat: [violin, remoteMap], spacing: 60, resolve: rightCol.resolve }];
      s.spacing = 48;
    },

    // C11 dumbbell, C12 Marimekko, C14 cohort arrows: fill the column
    c11: (s) => { s.width = "container"; s.height = 280; findLayer(s.layer, (l) => l.data && l.data.values).encoding.x = { value: { expr: "width" } }; },
    c12: (s) => { s.width = "container"; s.height = 360; },
    c14: (s) => { s.width = "container"; s.height = 330; }
  }
};

// Load a spec and apply this page's size overrides (if any)
// Specs are always re-fetched (no stale browser cache), and if a size override
// fails the chart still draws at its default size instead of disappearing.
async function loadSpec(id, url) {
  const spec = await (await fetch(url, { cache: "no-cache" })).json();
  const patch = (LAYOUT_PATCHES[LAYOUT] || {})[id];
  if (!patch) return spec;
  const patched = structuredClone(spec);
  try {
    patch(patched);
    return patched;
  } catch (err) {
    console.warn(`Size override for ${id} failed, using the spec's own sizes:`, err);
    return spec;
  }
}

const views = {};
const viewModes = {}; // which spec ("one" or "all") each chart is currently showing
const state = { domain: "Reading", yearLevel: 5 };
const mode = () => (state.domain === "All" ? "all" : "one");

// Push the selector state into one view (silently skip views without those params)
function applyState(view) {
  let changed = false;
  for (const [name, value] of [["domain", state.domain], ["yearLevel", state.yearLevel]]) {
    try {
      view.signal(name, value);
      changed = true;
    } catch (e) {
      /* this chart doesn't use the shared selector */
    }
  }
  if (changed) view.runAsync();
}

// Draw (or redraw) one chart with the spec that matches the current Domain choice
async function embedChart(id) {
  const variants = SPECS[id];
  const m = variants.all && mode() === "all" ? "all" : "one";
  const spec = await loadSpec(m === "all" ? id + "_all" : id, variants[m]);
  if (views[id]) views[id].finalize();
  const result = await vegaEmbed("#" + id, spec, EMBED_OPTS);
  views[id] = result.view;
  viewModes[id] = m;
  applyState(result.view);
}

async function onSelectorChange() {
  state.domain = document.getElementById("sel-domain").value;
  state.yearLevel = Number(document.getElementById("sel-year").value);

  // charts whose spec changes (one subject <-> all subjects) are redrawn,
  // the rest just receive the new Domain / Year level values
  const swap = Object.keys(SPECS).filter((id) => SPECS[id].all && viewModes[id] !== mode());
  Object.entries(views).forEach(([id, view]) => { if (!swap.includes(id)) applyState(view); });
  if (swap.length) {
    await Promise.all(swap.map((id) => embedChart(id).catch((err) => console.error(`Chart ${id} failed:`, err))));
    relinkCharts();
  }
}

// Links between charts have to be re-attached whenever a chart is redrawn
function relinkCharts() {
  linkMapToBump();
  onStateChange();
}

// C5 click → highlight the same state in C7
function linkMapToBump() {
  const map = views.c05;
  const bump = views.c07;
  if (!map || !bump) return;
  map.addSignalListener("pickState", (name, value) => {
    const picked = value && value.state ? [].concat(value.state)[0] : "";
    bump.signal("highlight", picked || "").runAsync();
  });
}

// "Zoom to" picker → focus the school map (C8) and violin (C9) on one state
function onStateChange() {
  const value = document.getElementById("sel-state").value;
  if (views.c08) views.c08.signal("focusState", value).runAsync();
}

async function init() {
  // wait for web fonts so Vega measures text with the right typeface
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  await Promise.all(
    Object.keys(SPECS).map((id) => embedChart(id).catch((err) => console.error(`Chart ${id} failed:`, err)))
  );

  window.charts = views; // handy for debugging in the browser console
  linkMapToBump();
  document.getElementById("sel-domain").addEventListener("change", onSelectorChange);
  document.getElementById("sel-year").addEventListener("change", onSelectorChange);
  document.getElementById("sel-state").addEventListener("change", onStateChange);
}

init();
