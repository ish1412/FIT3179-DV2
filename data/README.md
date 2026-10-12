# Cleaned data for DV2: NAPLAN Performance Trends

All files are small, tidy CSV/GeoJSON files that load straight into Vega-Lite (`"data": {"url": "data/<file>"}`). Total size is about 3.4 MB, but each chart only loads the file it needs. `build.py` rebuilds everything from the raw files in `Data/`.

## ⚠️ Three things to know before charting

1. **The scale changed in 2023.** NAPLAN moved online and was re-scaled, and the old "bands / national minimum standard" were replaced by 4 proficiency levels. **Scores from 2008–2022 can't be compared directly with scores from 2023 onwards** (ACARA says so). Show the two eras as separate segments with a visible break and an annotation. Don't draw one continuous line.
2. **There was no NAPLAN in 2020** (COVID), so leave a gap and don't interpolate across it.
3. **Tasmania 2026 results were suppressed by ACARA** (flag `s.p.`). For maps of 2026, show TAS as "not published", or use 2025 (the remoteness file includes both years).

Blank cells are values ACARA didn't publish (`n.p.`, `s.p.`, or no students). Use `"invalid": "filter"` or a "no data" grey.

## NAPLAN files (source: ACARA, NAPLAN national results)

| File | Rows | What it's for |
|---|---|---|
| `naplan_2008_2022_states.csv` | 2,412 | **Old scale.** State × year level × domain, all students. Mean score, % at/above national minimum standard, percentiles (p05/p20/p80/p95 → ribbon/fan charts), 6 achievement bands (→ stacked/ridgeline), participation. Writing starts 2011. |
| `naplan_2008_2022_subgroups_aus.csv` | 6,892 | **Old scale.** Australia only, every student subgroup (gender, Indigenous, remoteness, language background, parental education/occupation). For equity-gap trends. |
| `naplan_2023_2026_states.csv` | 700 | **New scale.** State × year level × domain, all students. Mean score + % in each proficiency level + % strong-or-above. |
| `naplan_2023_2026_subgroups_aus.csv` | 2,720 | **New scale.** Australia only, every subgroup, with proficiency levels. For gap charts (dumbbell, slope, diverging bars). |
| `naplan_2026_proficiency_long.csv` | 800 | Tidy/long version of 2026 proficiency levels (`level`, `pct`, `level_order`). Ready for diverging stacked bars. |
| `naplan_2025_2026_state_remoteness.csv` | 3,345 | State × remoteness area, for **all students** and **Indigenous / Non-Indigenous** (`students` column). The `geo_key` (`"NSW\|Remote"`) joins to `aus_remoteness.geojson`. |
| `naplan_cohort_gain_2023_2026.csv` | 2,791 | The same students tracked two years apart (Yr 3→5, 5→7, 7→9). `base_score`, `score`, `gain`. For slope charts and dumbbells. |
| `naplan_2008_2026_trend_combined.csv` | 3,112 | Mean score for all years with an `era` column. Use `era` for colour/detail so the line breaks at 2023. |
| `naplan_participation_2008_2026.csv` | 3,240 | Participation, absent, withdrawn and exempt %. **These are comparable across all years**, so you can draw one continuous trend. |

**Key fields:** `state` is the abbreviation (`AUS`, `NSW`, `VIC`, …), `domain` is one of Reading / Writing / Spelling / Grammar and Punctuation / Numeracy, and `year_level` is 3, 5, 7 or 9.

**Proficiency levels (2023+):** Exceeding > Strong > Developing > Needs additional support. "Strong or above" is ACARA's headline "meeting expectations" measure.

## School files (source: ACARA, School Profile 2025 + School Location 2025)

| File | Rows | What it's for |
|---|---|---|
| `schools_2025.csv` | 9,751 | One row per school, with lat/lon, sector, type, remoteness, ICSEA (socio-educational advantage; 1000 = average), enrolments, % Indigenous, % LBOTE. **Dot map** of schools coloured by ICSEA band. 4 external-territory schools were removed (Norfolk, Cocos, Christmas Is.), and 132 schools have no ICSEA (mostly small or special schools). |
| `schools_2025_by_sa4.csv` | 89 | Aggregated by SA4 region at the mean school location, with enrolment-weighted ICSEA. **Proportional-symbol map.** |
| `schools_2025_state_remoteness_sector.csv` | 91 | Counts, enrolments and median ICSEA by state × remoteness × sector. |

## Map files (source: ABS ASGS Edition 3, 2021)

| File | Size | Notes |
|---|---|---|
| `aus_states.geojson` | 79 KB | 8 states/territories. Properties: `state`, `state_abbr`. |
| `aus_remoteness.geojson` | 208 KB | 33 remoteness-area polygons (state × remoteness). Properties: `state_abbr`, `remoteness`, `ra_code`. |

Both were simplified (Douglas–Peucker, ~2 km tolerance) and use EPSG:4283/GDA2020 lon/lat. Use `"projection": {"type": "equalEarth"}` or `"mercator"`. Tiny islands and the "migratory/no usual address" pseudo-areas were dropped. Load with `"format": {"type": "json", "property": "features"}`.

### Example joins
```json
"data": {"url": "data/aus_remoteness.geojson", "format": {"type": "json", "property": "features"}},
"transform": [
  {"calculate": "datum.properties.state_abbr + '|' + datum.properties.remoteness", "as": "geo_key"},
  {"lookup": "geo_key", "from": {"data": {"url": "data/naplan_2025_2026_state_remoteness.csv"}, "key": "geo_key",
   "fields": ["pct_strong_or_above"]}}
]
```
(Vega-Lite `lookup` takes the first match, so filter the CSV first: wrap it in a named dataset, or pre-filter with a param for domain / year level / year / students.)

## Suggested map idioms (3 needed)
1. **Choropleth:** % strong-or-above by state (`aus_states` + `naplan_2023_2026_states`).
2. **Choropleth by remoteness area:** `aus_remoteness` + `naplan_2025_2026_state_remoteness`. This is the strongest "bush vs city" story, especially for Indigenous students.
3. **Dot / point map:** `schools_2025` coloured by ICSEA band.
4. **Proportional-symbol map:** `schools_2025_by_sa4` (size = enrolments, colour = ICSEA).

## Sources (cite on the page)
- ACARA, *NAPLAN national results* (2008–2026), https://www.acara.edu.au/reporting/national-report-on-schooling-in-australia/naplan-national-results
- ACARA, *School Profile 2025* and *School Location 2025*, https://www.acara.edu.au/contact-us/acara-data-access
- ABS, *Australian Statistical Geography Standard (ASGS) Edition 3*: State/Territory and Remoteness Areas 2021, https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3
