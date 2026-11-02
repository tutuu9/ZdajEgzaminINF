# Private grading fixtures

`index.ts` exports two valid implementations for each original project and focused invalid examples. It is a development fixture, not part of public bootstrap data or the browser bundle.

The PHP examples cover MySQLi and PDO, and the SQL examples include joins and equivalent subqueries. They query the database dynamically and therefore remain correct for the additional probe data used by the checker. All source code, datasets and SVG art in these fixtures are original project material.

`invalidSolutions` records the intended failed criteria. Manual criteria remain manual even for a valid fixture. Passing the automatic checks is not an official CKE assessment.
