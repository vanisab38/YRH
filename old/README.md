# Old scaffolding (superseded)

This is the original Express + SQLite scaffolding, moved aside rather than
deleted per the build spec (§7.1: "Never delete the existing code as part of
this"). Phase 0 inventory (see project history) found it held only invented
test data, had never been run against the real spreadsheet, and had no
deployed users — so it was empty scaffolding, not a migration target.

The project was rebuilt on Next.js + Postgres per §7's greenfield default.
Some logic here (Thai name-splitting on `/`, `,`, whitespace; date parsing)
was ported into `scripts/import_excel.py` in the new build.
