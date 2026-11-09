import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { getOpeningHours, getRestaurantInfo } from "@/lib/data";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Visit us | Anwar Best Restaurant",
  description: "Find the restaurant, check opening hours and get in touch with the team.",
};
export const instant = false;

export default async function ContactPage() {
  await connection();
  const restaurant = getRestaurantInfo();
  const openingHours = getOpeningHours();
  const mapUrl =
    restaurant.map_url ||
    (restaurant.address
      ? `https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`
      : "");
  const phoneLink = restaurant.phone.replace(/[^\d+]/g, "");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="inner-page-intro contact-page-intro">
          <div className="contact-intro-inner">
            <div>
              <p className="eyebrow"><span /> WE’LL SAVE YOU A SEAT</p>
              <h1>Come on <em>in.</em></h1>
              <p>Find us, check our hours, and plan a visit around something delicious.</p>
            </div>
            <Link className="button button-dark" href="/#reserve">
              Book online <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <section className="contact-page section-wrap">
          <div className="contact-layout">
            <div className="contact-details">
              <article>
                <span className="visit-index">01 / FIND US</span>
                <h2>Our address</h2>
                <p>{restaurant.address || "Location details will be shared here soon."}</p>
                {mapUrl && <a className="underlined-link" href={mapUrl} target="_blank" rel="noreferrer">Directions in Google Maps <span aria-hidden="true">↗</span></a>}
              </article>
              <article>
                <span className="visit-index">02 / SAY HELLO</span>
                <h2>Get in touch</h2>
                {restaurant.phone && <p><a href={`tel:${phoneLink}`}>{restaurant.phone}</a></p>}
                {restaurant.email && <p><a href={`mailto:${restaurant.email}`}>{restaurant.email}</a></p>}
                {!restaurant.phone && !restaurant.email && <p>Contact details will be shared here soon.</p>}
                <Link className="underlined-link" href="/#reserve">Request a reservation <span aria-hidden="true">↗</span></Link>
              </article>
              <article className="contact-hours-card">
                <span className="visit-index">03 / OPEN DOOR</span>
                <h2>Opening hours</h2>
                <div className="contact-hours">
                  {openingHours.map((hours) => (
                    <p key={hours.day_of_week}>
                      <span>{hours.label}</span>
                      <span>{hours.is_closed || !hours.open_time || !hours.close_time ? "Closed" : `${hours.open_time} – ${hours.close_time}`}</span>
                    </p>
                  ))}
                </div>
              </article>
            </div>
            <div className="contact-map">
              {restaurant.address ? (
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(restaurant.address)}&output=embed`}
                  title={`Map showing ${restaurant.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="map-empty">
                  <p className="eyebrow">PLAN YOUR VISIT</p>
                  <h2>We’ll help you find your way.</h2>
                  <p>Our location details are being updated. Reserve online and we’ll confirm your visit by phone.</p>
                  <Link className="button button-gold" href="/#reserve">
                    Book a table <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
