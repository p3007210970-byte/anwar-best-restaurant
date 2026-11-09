import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

const root = process.cwd();
const databaseFilename = `smoke-${randomUUID()}.sqlite`;
const databasePath = path.join(root, "data", databaseFilename);
const sessionSecret = randomBytes(32).toString("base64url");
const adminPassword = `${randomBytes(18).toString("base64url")}Aa1!`;
const environment = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  DATABASE_FILENAME: databaseFilename,
  SESSION_SECRET: sessionSecret,
  RATE_LIMIT_SALT: randomBytes(32).toString("hex"),
  ADMIN_EMAIL: "owner@smoke-test.example",
  ADMIN_PASSWORD: adminPassword,
};
let uploadedFile;
let server;
let cookie;

function logPass(message) {
  console.log(`PASS ${message}`);
}

function getRestaurantToday() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function runSeed() {
  const seed = spawnSync(
    process.execPath,
    [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "scripts/seed-admin.ts"],
    { cwd: root, env: environment, encoding: "utf8" },
  );
  if (seed.status !== 0) {
    throw new Error(`Admin seed failed:\n${seed.stdout}\n${seed.stderr}`);
  }
}

async function findPort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`The production server exited early:\n${serverOutput}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The production server did not start in time:\n${serverOutput}`);
}

let serverOutput = "";
async function request(baseUrl, route, options = {}) {
  const headers = new Headers(options.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers });
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return { response, body, text };
}

async function removeIfExists(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

try {
  if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
    throw new Error("Run npm run build before npm run test:smoke.");
  }

  runSeed();
  const port = await findPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    { cwd: root, env: environment, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-8000); });
  server.stderr.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-8000); });
  await waitForServer(baseUrl);

  const home = await request(baseUrl, "/");
  assert.equal(home.response.status, 200);
  assert.match(home.text, /Made with fire/);
  assert.equal(home.response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(home.response.headers.get("x-frame-options"), "DENY");
  logPass("homepage and security headers");

  const [menuPage, contactPage] = await Promise.all([
    request(baseUrl, "/menu"),
    request(baseUrl, "/contact"),
  ]);
  assert.equal(menuPage.response.status, 200);
  assert.match(menuPage.text, /Lamb Karahi/);
  assert.equal(contactPage.response.status, 200);
  logPass("public menu and contact pages");

  const unauthorized = await request(baseUrl, "/api/admin/reservations");
  assert.equal(unauthorized.response.status, 401);
  logPass("admin APIs reject unauthenticated requests");

  const bookingDate = new Date();
  bookingDate.setUTCDate(bookingDate.getUTCDate() + 4);
  const date = bookingDate.toISOString().slice(0, 10);
  const booking = {
    name: "Smoke Test Guest",
    phone: "+92 300 1234567",
    guests: "2",
    date,
    time: "19:30",
    note: "Integration test",
    website: "",
  };
  const invalidBooking = await request(baseUrl, "/api/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...booking, phone: "bad" }),
  });
  assert.equal(invalidBooking.response.status, 400);
  const pastBooking = await request(baseUrl, "/api/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...booking, date: getRestaurantToday(), time: "00:00" }),
  });
  assert.equal(pastBooking.response.status, 400);

  const reservationResponse = await request(baseUrl, "/api/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(booking),
  });
  assert.equal(reservationResponse.response.status, 201);
  assert.ok(reservationResponse.body.id);
  const reservationId = reservationResponse.body.id;
  logPass("validated reservation submission and persistence");

  const wrongLogin = await request(baseUrl, "/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: environment.ADMIN_EMAIL, password: "wrong-password" }),
  });
  assert.equal(wrongLogin.response.status, 401);

  const login = await request(baseUrl, "/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: environment.ADMIN_EMAIL, password: adminPassword }),
  });
  assert.equal(login.response.status, 200);
  const setCookie = login.response.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Secure/i);
  cookie = setCookie.split(";")[0];
  logPass("admin authentication and secure session cookie");

  const menuData = await request(baseUrl, "/api/admin/menu");
  assert.equal(menuData.response.status, 200);
  assert.ok(menuData.body.categories.length > 0);
  const category = await request(baseUrl, "/api/admin/categories", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Smoke Test Category", sort_order: 20 }),
  });
  assert.equal(category.response.status, 200);
  const createdCategoryId = category.body.id;

  const menuItem = await request(baseUrl, "/api/admin/menu", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      category_id: createdCategoryId,
      name: "Smoke Test Dish",
      description: "Created by the integration test.",
      price: 2500,
      image_url: "",
      is_available: true,
      sort_order: 10,
    }),
  });
  assert.equal(menuItem.response.status, 200);
  const menuItemId = menuItem.body.id;

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN8sAAAAASUVORK5CYII=",
    "base64",
  );
  const uploadData = new FormData();
  uploadData.append("image", new Blob([png], { type: "image/png" }), "dish.png");
  const upload = await request(baseUrl, "/api/admin/upload", {
    method: "POST",
    body: uploadData,
  });
  assert.equal(upload.response.status, 201);
  uploadedFile = path.join(root, "public", upload.body.url.replaceAll("/", path.sep));
  const updatedItem = await request(baseUrl, "/api/admin/menu", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: menuItemId,
      category_id: createdCategoryId,
      name: "Smoke Test Dish",
      description: "Price and image updated.",
      price: 2600,
      image_url: upload.body.url,
      is_available: true,
      sort_order: 10,
    }),
  });
  assert.equal(updatedItem.response.status, 200);

  const publicMenu = await request(baseUrl, "/api/menu");
  assert.equal(publicMenu.response.status, 200);
  assert.ok(publicMenu.body.items.some((item) => item.id === menuItemId && item.price === 2600));
  const uploadedImage = await request(baseUrl, upload.body.url);
  assert.equal(uploadedImage.response.status, 200);
  logPass("menu/category CRUD and verified image upload");

  const reservations = await request(baseUrl, `/api/admin/reservations?date=${date}`);
  assert.equal(reservations.response.status, 200);
  assert.equal(reservations.body.reservations[0].status, "pending");
  for (const status of ["confirmed", "rejected"]) {
    const updated = await request(baseUrl, `/api/admin/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    assert.equal(updated.response.status, 200);
  }
  const rejectedReservation = await request(baseUrl, `/api/admin/reservations?date=${date}`);
  assert.equal(rejectedReservation.body.reservations[0].status, "rejected");
  logPass("reservation review, confirmation and rejection");

  const settingsResult = await request(baseUrl, "/api/admin/settings");
  assert.equal(settingsResult.response.status, 200);
  const settings = settingsResult.body;
  const dayIndex = bookingDate.getUTCDay();
  settings.hours = settings.hours.map((hour) => ({
    ...hour,
    is_closed: Boolean(hour.is_closed),
    ...(hour.day_of_week === dayIndex
      ? { is_closed: true, open_time: null, close_time: null }
      : {}),
  }));
  settings.info = {
    name: "Anwar Smoke Kitchen",
    tagline: "A test restaurant for the smoke suite.",
    address: "1 Test Street",
    phone: "+92 300 0000000",
    email: "hello@smoke-test.example",
    map_url: "https://maps.google.com/?q=1+Test+Street",
  };
  const savedSettings = await request(baseUrl, "/api/admin/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(settings),
  });
  assert.equal(savedSettings.response.status, 200);
  const closedBooking = await request(baseUrl, "/api/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(booking),
  });
  assert.equal(closedBooking.response.status, 400);
  const updatedContact = await request(baseUrl, "/contact");
  assert.match(updatedContact.text, /Anwar Smoke Kitchen/);
  logPass("restaurant information and opening-hour settings");

  const blockedCategoryDelete = await request(
    baseUrl,
    `/api/admin/categories/${createdCategoryId}`,
    { method: "DELETE" },
  );
  assert.equal(blockedCategoryDelete.response.status, 409);
  const removedItem = await request(baseUrl, `/api/admin/menu?id=${menuItemId}`, { method: "DELETE" });
  assert.equal(removedItem.response.status, 200);
  const removedCategory = await request(
    baseUrl,
    `/api/admin/categories/${createdCategoryId}`,
    { method: "DELETE" },
  );
  assert.equal(removedCategory.response.status, 200);
  logPass("category deletion protects menu references");

  const signOut = await request(baseUrl, "/api/admin/logout", { method: "POST" });
  assert.equal(signOut.response.status, 200);
  cookie = undefined;
  const signedOut = await request(baseUrl, "/api/admin/menu");
  assert.equal(signedOut.response.status, 401);
  logPass("admin sign-out revokes session access");

  console.log("All restaurant smoke tests passed.");
} catch (error) {
  console.error(error);
  if (serverOutput) console.error(serverOutput);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    server.kill();
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  await removeIfExists(databasePath);
  await removeIfExists(`${databasePath}-shm`);
  await removeIfExists(`${databasePath}-wal`);
  if (uploadedFile) await removeIfExists(uploadedFile);
}
