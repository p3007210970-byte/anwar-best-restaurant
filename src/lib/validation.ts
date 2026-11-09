import { z } from "zod";

const name = z.string().trim().min(2).max(100);
const phone = z.string().trim().min(7).max(30).regex(/^[+\d\s().-]+$/);
const price = z.number().int().min(0).max(10_000_000);

export const reservationSchema = z.object({
  name,
  phone,
  guests: z.coerce.number().int().min(1).max(12),
  date: z.iso.date(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  note: z.string().trim().max(500).optional().default(""),
  website: z.string().max(0).optional().default(""),
});

export const loginSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

export const menuItemSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().min(1).max(100),
  name,
  description: z.string().trim().max(1000).default(""),
  price,
  image_url: z.string().trim().max(500).default(""),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(10000).default(0),
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60),
  sort_order: z.number().int().min(0).max(10000).default(0),
});

export const restaurantInfoSchema = z.object({
  name: z.string().trim().min(2).max(100),
  tagline: z.string().trim().max(180),
  address: z.string().trim().max(300),
  phone: z.string().trim().max(30).regex(/^[+\d\s().-]*$/),
  email: z.string().trim().max(254).refine((value) => value === "" || z.email().safeParse(value).success)
    .transform((value) => value.toLowerCase()),
  map_url: z.string().trim().max(1000).refine((value) => value === "" || z.url().safeParse(value).success)
    .refine((value) => value === "" || value.startsWith("https://")),
});

export const openingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  label: z.string().trim().min(3).max(15),
  open_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  close_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  is_closed: z.boolean(),
});
