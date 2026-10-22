// Same Test, Different Starting Lines: chart loader
// Embeds every Vega-Lite spec and wires up the shared Domain / Year level selector
// and the C5 → C6/C7 state highlight.

// One spec per chart. When the Domain dropdown is set to "Average of subjects", each
// chart shows the simple average of the five subjects (each spec handles this itself).
// A chart can also list an "all" spec to swap in for "Average of subjects".
const SPECS = {
  c01: { one: "js/specs/c01_waffle.vl.json" },
  c02: { one: "js/specs/c02_trend_focus.vl.json" },
  c03: { one: "js/specs/c03_diverging_proficiency.vl.json" },
  c04: { one: "js/specs/c04_change_heatmap.vl.json" },
  c05: { one: "js/specs/c05_contiguous_cartogram.vl.json" },
  c06: { one: "js/specs/c06_state_lines.vl.json" },
  c07: { one: "js/specs/c07_bump_rank.vl.json" },
  c08: { one: "js/specs/c08_c09_c10_postcode.vl.json" }, // C8 school map + C9 ICSEA histograms + C10 remoteness map
  c11: { one: "js/specs/c11_dumbbell_indigenous.vl.json" },
  c12: { one: "js/specs/c12_lollipop_parent_ed.vl.json" },
  c13: { one: "js/specs/c13_butterfly_gender.vl.json" },
  c14: { one: "js/specs/c14_cohort.vl.json" }
};

// Shared look for every chart
// Same family as the page CSS (--font-ui)
const FONT = '"IBM Plex Sans", Arial, Helvetica, sans-serif';
const HEAD = FONT; // chart titles in the same sans as the chart labels (bold), so everything inside a chart reads as one "data voice"
const INK = "#2B2A28";
const SOFT = "#6B675F";

const CONFIG = {
  background: "#FBF8F1",
  font: FONT,
  padding: 4,
  view: { stroke: null },
  title: {
    font: HEAD,
    fontSize: 20,
    fontWeight: "bold",
    color: INK,
    anchor: "start",
    offset: 10,
    subtitleFont: FONT,
    subtitleFontSize: 13,
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

// Keys are chart ids; "<id>_all" resizes a chart's "all" spec (if it has one).
const LAYOUT_PATCHES = {
  "two-column": {
    // C1 waffle: has the whole column to itself
    c01: (s) => { s.width = 310; s.height = 310; },

    // C2: one big panel (leave room on the right for the "Year 9" line labels)
    c02: (s) => { s.width = 920; s.height = 360; },

    // C3 diverging bars: fill the column
    c03: (s) => { s.width = "container"; s.height = 440; },

    // C4 heatmap: fill the column, bigger labels and legend
    c04: (s) => {
      s.width = "container";
      s.height = 380;
      s.layer[0].encoding.color.legend.gradientLength = { expr: "width" }; // legend as wide as the grid
      s.layer[1].mark.fontSize = 14;
    },

    // C6 state lines: fill the column (beside the C5 map)
    c06: (s) => { s.width = "container"; s.height = 410; },

    // C7 bump chart: fill the column (beside the text under the map)
    c07: (s) => {
      s.width = "container";
      s.height = 230;
      findLayer(s.layer, (l) => l.data && l.data.values).encoding.y.value = 230 + 26;
    },

    // C8 school map full width on top; C9 histograms + C10 remoteness map side by side below
    c08: (s) => {
      const [schoolMap, rightCol] = s.hconcat;
      const [histograms, remoteMap] = rightCol.vconcat;

      schoolMap.width = 1000;
      schoolMap.height = 820;
      const dots = findLayer(schoolMap.layer, (l) => l.mark.type === "circle");
      dots.encoding.size.scale.range = [20, 1000];
      dots.mark.opacity = 0.6;

      histograms.spec.width = 380;
      histograms.spec.height = 78;

      remoteMap.width = 430;
      remoteMap.height = 440;
      findLayer(remoteMap.layer, (l) => l.encoding).encoding.color.legend.gradientLength = 220;

      delete s.hconcat;
      s.vconcat = [schoolMap, { hconcat: [histograms, remoteMap], spacing: 60, resolve: rightCol.resolve }];
      s.spacing = 48;
    },

    // C11 dumbbell, C12 Marimekko, C14 cohort arrows: fill the column
    c11: (s) => { s.width = "container"; s.height = 345; findLayer(s.layer, (l) => l.data && l.data.values).encoding.x = { value: { expr: "width" } }; },
    c12: (s) => { s.width = "container"; s.height = 360; },

    // C13 gender bars: fill the column, bigger bars and labels
    c13: (s) => {
      s.width = "container";
      s.height = 360;
      s.layer.filter((l) => l.mark && l.mark.type === "text").forEach((l) => { l.mark.fontSize = 13; });
    },
    c14: (s) => { s.width = "container"; s.height = 260; }
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
  linkSchoolMapZoom();
  onStateChange();
}

// C5 click → highlight the same state in C6 (state lines) and C7 (ranks)
function linkMapToBump() {
  const map = views.c05;
  if (!map) return;
  map.addSignalListener("pickState", (name, value) => {
    const picked = value && value.state ? [].concat(value.state)[0] : "";
    [views.c06, views.c07].forEach((v) => { if (v) v.signal("highlight", picked || "").runAsync(); });
  });
}

// C8 click on a state (or a school in it), or C10 click on a region → zoom to that state; double-click → back to Australia
function linkSchoolMapZoom() {
  const map = views.c08;
  if (!map) return;
  const picker = document.getElementById("sel-state");
  const stateOf = (value) => (value && value.state ? [].concat(value.state)[0] : "");
  // one click updates all three selections (the one clicked is set, the others cleared),
  // so read them together; a click on empty space or a double-click clears them all: zoom out
  const onPick = () => {
    const picked = stateOf(map.signal("clickState")) || stateOf(map.signal("clickSchool")) || stateOf(map.signal("clickRemote"));
    if (picker.value === (picked || "All")) return;
    picker.value = picked || "All";
    onStateChange();
  };
  // wait until all the selections have updated before reading them
  let pending = null;
  const schedule = () => { clearTimeout(pending); pending = setTimeout(onPick, 0); };
  map.addSignalListener("clickState", schedule);
  map.addSignalListener("clickSchool", schedule);
  map.addSignalListener("clickRemote", schedule);
}

// "Zoom to" picker → focus the school map (C8), histograms (C9) and remoteness map (C10) on one state
function onStateChange() {
  const value = document.getElementById("sel-state").value;
  if (views.c08) views.c08.signal("focusState", value).runAsync();
}

async function init() {
  // wait for web fonts so Vega measures text with the right typeface
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  // start from whatever the dropdowns show (the browser can restore them on reload)
  state.domain = document.getElementById("sel-domain").value;
  state.yearLevel = Number(document.getElementById("sel-year").value);

  await Promise.all(
    Object.keys(SPECS).map((id) => embedChart(id).catch((err) => console.error(`Chart ${id} failed:`, err)))
  );

  window.charts = views; // handy for debugging in the browser console
  linkMapToBump();
  linkSchoolMapZoom();
  document.getElementById("sel-domain").addEventListener("change", onSelectorChange);
  document.getElementById("sel-year").addEventListener("change", onSelectorChange);
  document.getElementById("sel-state").addEventListener("change", onStateChange);
}

init();
