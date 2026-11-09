# Anwar Best Restaurant

A responsive restaurant website and owner dashboard built with Next.js, TypeScript, SQLite, and Tailwind CSS.

## What is included

- Restaurant homepage, full menu, contact details, opening hours, Google Maps directions, photo gallery, and reservation form.
- SQLite storage for menu items, categories, reservations, restaurant details, opening hours, and admin accounts.
- Owner sign-in, reservation approval/rejection, category and menu editing, image uploads, and restaurant-hours management.
- Validated API requests, rate-limited sign-in and reservation requests, password hashing, and secure HTTP-only admin sessions.

## Start the project

Requirements: Node.js 22.13 or newer and npm.

1. In PowerShell, copy the example settings: `Copy-Item .env.example .env.local`.
2. Open `.env.local` and set `SESSION_SECRET` to a random secret with at least 32 characters. You can generate one with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

3. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` with at least 12 characters in `.env.local`.
4. Create the owner account once: `npm run setup:admin`.
5. Start the website: `npm run dev`.
6. Visit `http://localhost:3000` for the public site or `http://localhost:3000/admin/login` for the owner dashboard.

The first application request creates the SQLite database and starter menu. The starter hours are examples; update the restaurant name, address, phone, email, map link, and every day’s hours in **Restaurant & hours** before publishing. Replace the sample menu and food photos with the restaurant’s actual offerings.

## Checks

- `npm run typecheck` — TypeScript checks.
- `npm run lint` — ESLint.
- `npm run build` — production build.
- `npm run test:smoke` — runs a production-server smoke suite with a temporary database and removes its test data.

## Production notes

- Use HTTPS in production; the admin session cookie is marked `Secure` automatically in production mode.
- Set a new strong `SESSION_SECRET` and a separate `RATE_LIMIT_SALT` in the host’s secret manager. Never commit `.env.local`.
- This app stores its SQLite database in `./data/restaurant.sqlite` (or the `.sqlite` filename set by `DATABASE_FILENAME`) and uploaded images in `./public/uploads`. Deploy to a Node.js host with a persistent writable disk, and back up both locations. Ephemeral/serverless filesystems are not suitable without a persistent volume or a migration to managed storage.
- Seed the owner account before serving traffic. Keep the owner password private and do not share dashboard credentials.
- Reservation requests are saved as **pending**. The restaurant must confirm or reject them in the dashboard and contact the guest directly; the app does not send email or SMS confirmations.
- Add the restaurant’s required privacy notice and define a customer-data retention policy before public launch.
