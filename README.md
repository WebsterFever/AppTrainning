# Webster Technology School

A blog-style board for posting upcoming training classes. Visitors browse classes,
register with name + email, and immediately see the Zoom link on screen to copy and
save. Everyone can see how many people have registered for each class. You (the
admin) sign in with an email + password (bcrypt-hashed, JWT session) to add classes
and mark them as past.

## Stack
- **Backend:** NestJS + TypeORM + PostgreSQL, bcrypt + JWT (admin login)
- **Frontend:** React + Vite + Tailwind

## How it works
- `GET /classes?status=upcoming|past` — public, returns classes with live registration counts (no Zoom link exposed until you register)
- `POST /classes/:id/register` — public, saves the registration and returns the Zoom link in the response, shown on screen with a copy button
- `POST /auth/login` — public, exchanges admin email + password for a JWT
- `POST /classes`, `PATCH /classes/:id`, `PATCH /classes/:id/mark-past`, `DELETE /classes/:id` — admin only, requires `Authorization: Bearer <JWT>` from `/auth/login`

## Setup

### 1. PostgreSQL
Create a database, e.g. `createdb classboard`. Tables are auto-created on first run (`synchronize: true` — fine for getting started; switch to migrations before production).

### 2. Admin account
Passwords are bcrypt-hashed and stored in a `users` table — there's no public signup endpoint, so the first admin is created via a seed script:
1. Set `JWT_SECRET` (e.g. `openssl rand -hex 32`) and `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`.
2. Run `npm run seed:admin` from `backend/` once Postgres is reachable — it creates the user and hashes the password. You can remove `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` afterward.

### 3. Backend
```bash
cd backend
cp .env.example .env   # fill in DB + JWT + admin seed values
npm install
npm run seed:admin     # creates the first admin user (once, after step 2)
npm run start:dev
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env   # fill in API URL
npm install
npm run dev
```

Visit `http://localhost:5173`. Sign in at `/admin` with the email + password you seeded above.

## Notes on what's included vs. what to extend
- **Duplicate registration protection:** one registration per email per class (DB-level unique constraint).
- **Zoom link privacy:** the link isn't exposed in the public `GET /classes` or `GET /classes/:id` responses — it's only returned in the `POST /classes/:id/register` response, shown on screen after registering.
- **Image uploads:** classes take an image *URL* (e.g. from Unsplash, Cloudinary, or a storage bucket) rather than a file upload, to keep the first version simple. Swap in `@nestjs/platform-express` + `multer` if you want direct uploads from the admin dashboard.
- **Rate limiting:** basic throttling is on (`ThrottlerModule`), worth tightening for the public register endpoint specifically before going live.
- **Migrations:** `synchronize: true` is convenient for development; switch to TypeORM migrations before deploying with real data.
- **Admin accounts:** only the seed script creates admins — there's no in-app "add admin" UI. Rerun `npm run seed:admin` with different `ADMIN_EMAIL`/`ADMIN_PASSWORD` values to add more.
