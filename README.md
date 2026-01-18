# Movie Club

Website project to display stats from a movie club list of movies.

## Dev Setup

### Requirements

- `uv` Python project manager
  - `uv venv` can be used to create a virtual environment for the project.
  - All dependencies are automatically managed by `uv`.
- `rust`/`cargo`
  - All dependencies are automatically managed by `cargo`.
- `npm` & `node` 24
  - All dependencies are automatically managed by `npm`.

### Scraper

The scraper CLI must be present in your path as `movie-club-scraper`. To easily
achieve this, you can run `uv tool install --reinstall .` from the `scraper/`
directory.

For standalone tests on the scraper, `uv run movie-club-scraper ...` can be used
to test changes without building and installing the full project.

### Webapp

The webapp consists of a frontend and backend. The frontend can be started
by running `npm run dev` from the `frontend/` directory. Any changes made to
the frontend is dynamically reloaded.

The backend can be started by running `cargo run` from the `backend/` directory.
Changes _are not_ dynamically reloaded, and the cargo command must be run
each time changes are made to the backend code.
