Chart bounce correction

- Stop accumulating the No positions / backfill paused message on every draw.
- Generate bounded, idempotent history status from a separate per-market base value; skip unchanged DOM writes.
- Keep the chart toolbar at a fixed height and prevent Zoom/Respawn wrapping.
- Preserve minimize/restore, Max sizing, flat-market backfill pause and host diagnostics.
- Regressions exercise repeated native status updates and chart redraws in portrait, short portrait and landscape. Numerical research-engine compatibility stays at 1.6.0.
