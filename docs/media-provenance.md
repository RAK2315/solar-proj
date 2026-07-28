# Media provenance

Every committed media asset, where it came from, and under what licence. Nothing is
hotlinked — a demo that fetches at runtime is a demo that fails on a bad conference
network.

## Cinematic background

| Field | Value |
|---|---|
| **File** | `public/cinematic/flyover.webm` (14 MB, 720p VP9) |
| **Source** | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Aasen_agrivoltaics_solar_plant_with_walls_of_vertical_bifacial_modules_near_Donaueschingen_Germany_02.webm) |
| **Title** | *Aasen agrivoltaics solar plant with walls of vertical bifacial modules near Donaueschingen Germany 02* |
| **Author** | Tobi Kellner |
| **Licence** | **CC0 1.0** — public domain dedication, no attribution required (credited anyway) |
| **Original** | 3840×2160, 230 MB. We ship Commons' own 720p VP9 transcode. |

### Say this out loud rather than letting someone notice it

**This clip is a background plate, not footage of Bhadla.** It is a German
agrivoltaic site; the demo models a 500 MW block of Bhadla Solar Park in Rajasthan.
It is warm-graded in CSS so it reads as arid rather than as a green European field,
and that grade is a stylistic choice, not an attempt to pass it off as the site.

Nothing measured is derived from it. The telemetry comes from the physics model, the
defect from the trained detector, the hot cells from a real thermal frame. The
background is set dressing for the drone's point of view, and it is a **swap seam**:
`CinematicBackground` is replaced by `<SolarFarmScene />` at Phase 8, at which point
the view becomes an explicitly simulated Bhadla rather than someone else's site.

If asked, the honest sentence is: *"the flyover plate is CC0 stock while the 3D scene
is being built — every number and every piece of evidence comes from the pipeline,
not from that video."*

## Evidence media

| File | Source | Licence |
|---|---|---|
| `data/evidence/b17_thermal.png` | Rendered by `scripts/thermal_hotspot.py` from Raptor Maps `7916.jpg` | MIT (source dataset) |
| `data/evidence/b17_rgb.jpg` | Roboflow `solar-panel-fault-detection` v2, held-out test split | CC BY 4.0 |
| `data/evidence/b17_rgb_annotated.jpg` | The above, with the model's own box burned in | CC BY 4.0 |

Full dataset detail: `docs/dataset-provenance.md`.

## Fonts

IBM Plex Mono / Sans / Sans Condensed — **SIL Open Font License 1.1**, served
self-hosted by `next/font/google` at build time. No runtime request to Google.
