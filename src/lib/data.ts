import "server-only";

import { getDb, MenuCategory, MenuItem } from "@/lib/db";

export type RestaurantInfo = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  map_url: string;
};

export type OpeningHour = {
  day_of_week: number;
  label: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: number;
};

export function getPublicMenu(): MenuItem[] {
  return getDb()
    .prepare(
      `SELECT m.id, m.category_id, c.name AS category_name, m.name, m.description,
        m.price, m.image_url, m.is_available, m.sort_order
       FROM menu_items m JOIN categories c ON c.id = m.category_id
       WHERE m.is_available = 1 ORDER BY c.sort_order, m.sort_order, m.name`,
    )
    .all() as MenuItem[];
}

export function getMenuCategories(): MenuCategory[] {
  return getDb()
    .prepare("SELECT id, name, sort_order FROM categories ORDER BY sort_order, name")
    .all() as MenuCategory[];
}

export function getRestaurantInfo(): RestaurantInfo {
  return getDb()
    .prepare("SELECT name, tagline, address, phone, email, map_url FROM restaurant_info WHERE id = 1")
    .get() as RestaurantInfo;
}

export function getOpeningHours(): OpeningHour[] {
  return getDb()
    .prepare(
      "SELECT day_of_week, label, open_time, close_time, is_closed FROM opening_hours ORDER BY day_of_week",
    )
    .all() as OpeningHour[];
}
