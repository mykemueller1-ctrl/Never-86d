# Vercel deployment

1. Import this repository into Vercel and keep the detected root directory at
   the repository root.
2. Set the project install command to `pnpm install --frozen-lockfile` (this is
   already configured in `vercel.json`).
3. Add the variables in `.env.example` to the Vercel project settings. Set
   `DATABASE_URL` to the connection string for the database used by the
   application.
4. Deploy. Vercel serves the Vite build from `dist/public` and routes the
   Express/tRPC handler through `api/index.ts`.

The current schema and Drizzle configuration use the MySQL dialect. Neon
Postgres connection strings are not compatible with this application until the
schema and database driver are migrated to Drizzle's PostgreSQL dialect.
