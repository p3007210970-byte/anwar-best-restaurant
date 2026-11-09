"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; sort_order: number };
type MenuItem = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: number | boolean;
  sort_order: number;
};
type Reservation = {
  id: string;
  name: string;
  phone: string;
  guests: number;
  reservation_date: string;
  reservation_time: string;
  note: string;
  status: "pending" | "confirmed" | "rejected";
  created_at: string;
};
type RestaurantInfo = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  map_url: string;
};
type OpeningHour = {
  day_of_week: number;
  label: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: number;
};
type Tab = "bookings" | "menu" | "settings";
type DashboardPayload<T> = T & { error?: string };

async function getPayload<T>(
  response: Response,
  onUnauthorized?: () => void,
): Promise<DashboardPayload<T>> {
  const payload = (await response.json()) as DashboardPayload<T>;
  if (response.status === 401) {
    onUnauthorized?.();
    throw new Error("Please sign in again.");
  }
  if (!response.ok) throw new Error(payload.error ?? "That change could not be saved.");
  return payload;
}

async function getJson<T>(url: string, onUnauthorized?: () => void): Promise<DashboardPayload<T>> {
  return getPayload<T>(await fetch(url), onUnauthorized);
}

export default function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("bookings");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [hours, setHours] = useState<OpeningHour[]>([]);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadReservations(date = bookingDate) {
    const data = await getJson<{ reservations: Reservation[] }>(
      `/api/admin/reservations?date=${encodeURIComponent(date)}`,
      () => router.replace("/admin/login"),
    );
    setReservations(data.reservations);
  }

  async function loadMenu() {
    const data = await getJson<{ items: MenuItem[]; categories: Category[] }>(
      "/api/admin/menu",
      () => router.replace("/admin/login"),
    );
    setItems(data.items);
    setCategories(data.categories);
  }

  useEffect(() => {
    let active = true;
    async function loadInitialDashboard() {
      try {
        const [reservationData, menuData, settingsData] = await Promise.all([
          getJson<{ reservations: Reservation[] }>(
            `/api/admin/reservations?date=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`,
            () => router.replace("/admin/login"),
          ),
          getJson<{ items: MenuItem[]; categories: Category[] }>(
            "/api/admin/menu",
            () => router.replace("/admin/login"),
          ),
          getJson<{ info: RestaurantInfo; hours: OpeningHour[] }>(
            "/api/admin/settings",
            () => router.replace("/admin/login"),
          ),
        ]);
        if (!active) return;
        setReservations(reservationData.reservations);
        setItems(menuData.items);
        setCategories(menuData.categories);
        setRestaurant(settingsData.info);
        setHours(settingsData.hours);
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "The dashboard could not be loaded.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadInitialDashboard();
    return () => { active = false; };
  }, [router]);

  async function saveMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      let imageUrl = draft.image_url;
      if (imageFile) {
        const upload = new FormData();
        upload.set("image", imageFile);
        const uploaded = await getPayload<{ url: string }>(
          await fetch("/api/admin/upload", { method: "POST", body: upload }),
          () => router.replace("/admin/login"),
        );
        imageUrl = uploaded.url;
      }

      await getPayload<{ id: string }>(
        await fetch("/api/admin/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft,
            id: draft.id || undefined,
            price: Number(draft.price),
            image_url: imageUrl,
            is_available: Boolean(draft.is_available),
          }),
        }),
        () => router.replace("/admin/login"),
      );
      setDraft(null);
      setImageFile(null);
      setNotice("Menu item saved.");
      await loadMenu();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The menu item could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMenuItem(id: string) {
    if (!window.confirm("Remove this menu item?")) return;
    setError("");
    try {
      await getPayload<{ ok: boolean }>(
        await fetch(`/api/admin/menu?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
        () => router.replace("/admin/login"),
      );
      setNotice("Menu item removed.");
      await loadMenu();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The menu item could not be removed.");
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>, category?: Category) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("category_name") ?? "").trim();
    const sortOrder = Number(form.get("category_order") ?? 0);
    setError("");

    try {
      await getPayload<{ id: string }>(
        await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: category?.id,
            name,
            sort_order: Number.isInteger(sortOrder) && sortOrder >= 0 ? sortOrder : 0,
          }),
        }),
        () => router.replace("/admin/login"),
      );
      setCategoryName("");
      setNotice(category ? "Category updated." : "Category added.");
      await loadMenu();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The category could not be saved.");
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete "${category.name}"? Categories with menu items cannot be deleted.`)) return;
    setError("");
    try {
      await getPayload<{ ok: boolean }>(
        await fetch(`/api/admin/categories/${encodeURIComponent(category.id)}`, { method: "DELETE" }),
        () => router.replace("/admin/login"),
      );
      setNotice("Category removed.");
      await loadMenu();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The category could not be removed.");
    }
  }

  async function updateReservation(reservation: Reservation, status: "confirmed" | "rejected") {
    setError("");
    try {
      await getPayload<{ ok: boolean }>(
        await fetch(`/api/admin/reservations/${encodeURIComponent(reservation.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
        () => router.replace("/admin/login"),
      );
      setNotice(`Reservation ${status}.`);
      await loadReservations();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The reservation could not be updated.");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      await getPayload<{ ok: boolean }>(
        await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ info: restaurant, hours }),
        }),
        () => router.replace("/admin/login"),
      );
      setNotice("Restaurant information and opening hours saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Restaurant settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sign out could not be completed.");
    }
  }

  const pendingCount = reservations.filter((reservation) => reservation.status === "pending").length;
  const confirmedCount = reservations.filter((reservation) => reservation.status === "confirmed").length;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="brand" href="/">
          <span className="brand-mark">A</span>
          <span className="brand-name">ANWAR <span>OWNER DASHBOARD</span></span>
        </Link>
        <div className="admin-account">
          <span>{email}</span>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-welcome">
          <div>
            <p className="eyebrow"><span /> YOUR RESTAURANT, AT A GLANCE</p>
            <h1>Good to see you <em>back.</em></h1>
          </div>
          <Link className="admin-view-site" href="/" target="_blank" rel="noreferrer">View your website ↗</Link>
        </div>

        <div className="admin-stats">
          <div><span>RESERVATIONS THIS DAY</span><strong>{reservations.length}</strong></div>
          <div><span>WAITING FOR YOU</span><strong>{pendingCount}</strong></div>
          <div><span>CONFIRMED</span><strong>{confirmedCount}</strong></div>
        </div>

        <nav className="admin-tabs" aria-label="Dashboard sections">
          {([
            ["bookings", "Reservations"],
            ["menu", "Menu & categories"],
            ["settings", "Restaurant & hours"],
          ] as const).map(([id, label]) => (
            <button type="button" key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setNotice(""); setError(""); }}>
              {label}
            </button>
          ))}
        </nav>

        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        {isLoading ? (
          <p className="admin-loading">Loading your restaurant data…</p>
        ) : (
          <>
            {tab === "bookings" && (
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div><span className="admin-kicker">GUESTS AT YOUR TABLE</span><h2>Reservations</h2></div>
                  <form className="admin-date-filter" onSubmit={(event) => { event.preventDefault(); void loadReservations(bookingDate).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Reservations could not be loaded.")); }}>
                    <input aria-label="Filter reservations by date" type="date" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
                    <button className="admin-small-button" type="submit">Show day</button>
                  </form>
                </div>
                {reservations.length === 0 ? (
                  <div className="admin-empty">No reservations for this date yet.</div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>GUEST</th><th>TIME</th><th>PARTY</th><th>NOTE</th><th>STATUS</th><th>ACTION</th></tr></thead>
                      <tbody>
                        {reservations.map((reservation) => (
                          <tr key={reservation.id}>
                            <td><strong>{reservation.name}</strong><a href={`tel:${reservation.phone}`}>{reservation.phone}</a></td>
                            <td>{reservation.reservation_time}</td>
                            <td>{reservation.guests} guests</td>
                            <td>{reservation.note || "—"}</td>
                            <td><span className={`status-pill status-${reservation.status}`}>{reservation.status}</span></td>
                            <td>
                              {reservation.status === "pending" ? (
                                <span className="admin-actions">
                                  <button type="button" onClick={() => void updateReservation(reservation, "confirmed")}>Confirm</button>
                                  <button type="button" onClick={() => void updateReservation(reservation, "rejected")}>Reject</button>
                                </span>
                              ) : <span className="admin-muted">Updated</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {tab === "menu" && (
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div><span className="admin-kicker">FRESH FROM YOUR KITCHEN</span><h2>Menu items</h2></div>
                  <button className="admin-small-button" type="button" onClick={() => {
                    if (categories.length === 0) { setError("Add a category before creating a menu item."); return; }
                    setError("");
                    setImageFile(null);
                    setDraft({ id: "", category_id: categories[0].id, category_name: categories[0].name, name: "", description: "", price: 0, image_url: "", is_available: true, sort_order: items.length });
                  }}>+ Add a dish</button>
                </div>
                {draft && (
                  <form className="admin-editor" onSubmit={saveMenuItem}>
                    <div className="admin-editor-title"><h3>{draft.id ? "Edit this dish" : "Add a dish"}</h3><button type="button" onClick={() => setDraft(null)}>Close</button></div>
                    <div className="admin-form-grid">
                      <label>NAME<input required minLength={2} maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                      <label>CATEGORY<select value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                      <label>PRICE (PKR)<input type="number" min={0} step={1} required value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label>
                      <label>DISPLAY ORDER<input type="number" min={0} step={1} value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} /></label>
                      <label className="admin-wide">DESCRIPTION<textarea rows={2} maxLength={1000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                      <label className="admin-wide">FOOD PHOTO (JPG, PNG OR WEBP; UP TO 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>
                      <label className="admin-wide">OR PHOTO URL<input type="url" maxLength={500} placeholder="https://…" value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} /></label>
                      <label className="admin-check"><input type="checkbox" checked={Boolean(draft.is_available)} onChange={(event) => setDraft({ ...draft, is_available: event.target.checked })} /> Available on the public menu</label>
                    </div>
                    <button className="admin-small-button" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save dish"}</button>
                  </form>
                )}
                {items.length === 0 ? <div className="admin-empty">Your menu is empty. Add a dish to get started.</div> : (
                  <div className="admin-menu-list">
                    {items.map((item) => (
                      <article className="admin-menu-row" key={item.id}>
                        <div className="admin-dish-thumb" style={{ backgroundImage: item.image_url ? `url("${item.image_url}")` : undefined }} />
                        <div className="admin-dish-copy"><span>{item.category_name}</span><strong>{item.name}</strong><small>PKR {item.price.toLocaleString("en-PK")} · {item.is_available ? "On menu" : "Hidden"}</small></div>
                        <button type="button" onClick={() => { setImageFile(null); setDraft({ ...item, is_available: Boolean(item.is_available) }); }}>Edit</button>
                        <button className="admin-danger-link" type="button" onClick={() => void deleteMenuItem(item.id)}>Remove</button>
                      </article>
                    ))}
                  </div>
                )}

                <div className="admin-categories">
                  <div className="admin-panel-heading"><div><span className="admin-kicker">ORGANISE THE MENU</span><h2>Categories</h2></div></div>
                  <form className="category-add-form" onSubmit={(event) => {
                    event.preventDefault();
                    void (async () => {
                      const name = categoryName.trim();
                      if (name.length < 2) { setError("Category names need at least two characters."); return; }
                      try {
                        await getPayload<{ id: string }>(await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, sort_order: categories.length }) }), () => router.replace("/admin/login"));
                        setCategoryName("");
                        setNotice("Category added.");
                        await loadMenu();
                      } catch (requestError) {
                        setError(requestError instanceof Error ? requestError.message : "The category could not be saved.");
                      }
                    })();
                  }}>
                    <input aria-label="New category name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category name" maxLength={60} />
                    <button className="admin-small-button" type="submit">Add category</button>
                  </form>
                  <div className="category-list">
                    {categories.map((category) => (
                      <form className="category-row" key={category.id} onSubmit={(event) => void saveCategory(event, category)}>
                        <input aria-label={`${category.name} category name`} name="category_name" defaultValue={category.name} maxLength={60} minLength={2} required />
                        <input aria-label={`${category.name} display order`} name="category_order" type="number" min={0} defaultValue={category.sort_order} />
                        <button type="submit">Save</button>
                        <button className="admin-danger-link" type="button" onClick={() => void deleteCategory(category)}>Remove</button>
                      </form>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {tab === "settings" && restaurant && (
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="admin-kicker">THE DETAILS THAT BRING GUESTS IN</span><h2>Restaurant details</h2></div></div>
                <form className="admin-settings-form" onSubmit={saveSettings}>
                  <div className="admin-form-grid">
                    <label>RESTAURANT NAME<input required minLength={2} maxLength={100} value={restaurant.name} onChange={(event) => setRestaurant({ ...restaurant, name: event.target.value })} /></label>
                    <label>TAGLINE<input maxLength={180} value={restaurant.tagline} onChange={(event) => setRestaurant({ ...restaurant, tagline: event.target.value })} /></label>
                    <label className="admin-wide">ADDRESS<input maxLength={300} value={restaurant.address} onChange={(event) => setRestaurant({ ...restaurant, address: event.target.value })} /></label>
                    <label>PHONE<input type="tel" maxLength={30} value={restaurant.phone} onChange={(event) => setRestaurant({ ...restaurant, phone: event.target.value })} /></label>
                    <label>EMAIL<input type="email" maxLength={254} value={restaurant.email} onChange={(event) => setRestaurant({ ...restaurant, email: event.target.value })} /></label>
                    <label className="admin-wide">MAP LINK (OPTIONAL)<input type="url" maxLength={1000} placeholder="https://maps.google.com/…" value={restaurant.map_url} onChange={(event) => setRestaurant({ ...restaurant, map_url: event.target.value })} /></label>
                  </div>
                  <div className="admin-hours">
                    <div className="admin-panel-heading"><div><span className="admin-kicker">WHEN THE DOOR IS OPEN</span><h2>Opening hours</h2></div></div>
                    {hours.map((hour, index) => (
                      <div className="hours-row" key={hour.day_of_week}>
                        <strong>{hour.label}</strong>
                        <label className="hours-closed"><input type="checkbox" checked={Boolean(hour.is_closed)} onChange={(event) => setHours(hours.map((row, rowIndex) => rowIndex === index ? { ...row, is_closed: Number(event.target.checked) } : row))} /> Closed</label>
                        <input aria-label={`${hour.label} opening time`} type="time" disabled={Boolean(hour.is_closed)} value={hour.open_time ?? ""} onChange={(event) => setHours(hours.map((row, rowIndex) => rowIndex === index ? { ...row, open_time: event.target.value || null } : row))} />
                        <span>to</span>
                        <input aria-label={`${hour.label} closing time`} type="time" disabled={Boolean(hour.is_closed)} value={hour.close_time ?? ""} onChange={(event) => setHours(hours.map((row, rowIndex) => rowIndex === index ? { ...row, close_time: event.target.value || null } : row))} />
                      </div>
                    ))}
                  </div>
                  <button className="admin-small-button" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save restaurant details"}</button>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
