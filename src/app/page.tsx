import ReservationForm from "@/components/reservation-form";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import Link from "next/link";
import { getOpeningHours, getPublicMenu, getRestaurantInfo } from "@/lib/data";
import { connection } from "next/server";
import { getReservationDateLimits } from "@/lib/reservation-dates";

export const instant = false;

export default async function Home() {
  await connection();
  const dishes = getPublicMenu().slice(0, 3);
  const restaurant = getRestaurantInfo();
  const openingHours = getOpeningHours();
  const reservationDates = getReservationDateLimits();
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
        <section className="hero">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-content">
            <p className="eyebrow hero-eyebrow">
              <span /> A TABLE WORTH GATHERING AROUND
            </p>
            <h1>
              Made with fire.
              <br />
              Shared with <em>love.</em>
            </h1>
            <p className="hero-copy">
              Honest Pakistani cooking, slow-simmered tradition, and a warm
              welcome waiting just for you.
            </p>
            <div className="hero-actions">
              <a className="button button-gold" href="#reserve">
                Reserve your table <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="#menu">
                Explore the menu <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <div className="hero-note">
            <span>FRESH FROM THE FIRE</span>
            <span>EST. WITH LOVE</span>
          </div>
          <a className="scroll-cue" href="#story" aria-label="Scroll to our story">
            <span />
          </a>
        </section>

        <section className="welcome section-wrap" id="story">
          <div className="welcome-copy">
            <p className="eyebrow"><span /> THE {restaurant.name.toUpperCase()} WAY</p>
            <h2>Some flavours just feel like <em>home.</em></h2>
            <p className="body-copy">
              At {restaurant.name}, every dish begins with the good stuff: recipes passed
              down, spices ground fresh, and ingredients chosen with care. We
              bring people together over food that tastes like it has a story
              to tell.
            </p>
            <a className="underlined-link" href="#visit">
              A little more about us <span aria-hidden="true">↗</span>
            </a>
            <div className="signature">
              <span className="signature-mark">A</span>
              <span><strong>Made by {restaurant.name}</strong><small>WITH HEART, EVERY DAY</small></span>
            </div>
          </div>
          <div className="welcome-visual">
            <div className="welcome-photo" role="img" aria-label="A table set for a meal at a warmly lit restaurant" />
            <div className="welcome-stamp">
              <span>GOOD FOOD</span>
              <strong>Good<br />company</strong>
              <span>ALWAYS</span>
            </div>
            <span className="image-caption">A PLACE TO SLOW DOWN & STAY A WHILE</span>
          </div>
        </section>

        <section className="menu-section" id="menu">
          <div className="section-wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow"><span /> STRAIGHT FROM OUR KITCHEN</p>
                <h2>A few <em>favourites.</em></h2>
              </div>
              <Link className="underlined-link" href="/menu">
                View the full menu <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="dish-grid">
              {dishes.map((dish, index) => (
                <article className="dish-card" key={dish.name}>
                  <div
                    className="dish-photo"
                    role="img"
                    aria-label={dish.name}
                    style={{ backgroundImage: dish.image_url ? `url("${dish.image_url}")` : undefined }}
                  >
                    <span className="dish-number">0{index + 1}</span>
                  </div>
                  <div className="dish-info">
                    <div><p>{dish.category_name.toUpperCase()}</p><h3>{dish.name}</h3></div>
                    <span className="dish-price">PKR {dish.price.toLocaleString("en-PK")}</span>
                  </div>
                </article>
              ))}
            </div>
            {dishes.length === 0 && <p className="menu-footnote">Our menu is being prepared. Please check back soon.</p>}
            <p className="menu-footnote">Cooked fresh to order. Always worth the wait.</p>
          </div>
        </section>

        <section className="quote-section">
          <div className="quote-inner">
            <p className="quote-credit"><span /> THE HEART OF {restaurant.name.toUpperCase()}</p>
            <h2 className="quote-heading">Good food brings everyone to the same table.</h2>
            <p className="quote-copy">Old recipes, fresh ingredients, and a place for everyone.</p>
          </div>
        </section>

        <section className="gallery-section section-wrap" id="moments">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span /> LITTLE MOMENTS, BIG FLAVOUR</p>
              <h2>Take a <em>look around.</em></h2>
            </div>
            <p className="gallery-intro">The table is set, the grill is warm, and there’s always room for one more.</p>
          </div>
          <div className="gallery-grid">
            {[
              { image: "photo-1555939594-58d7cb561ad1", description: "Fresh food prepared over an open flame" },
              { image: "photo-1504674900247-0877df9cc836", description: "Freshly prepared dishes ready to share" },
              { image: "photo-1544025162-d76694265947", description: "A freshly grilled restaurant favourite" },
              { image: "photo-1547592180-85f173990554", description: "Fresh ingredients from the kitchen" },
            ].map((image, index) => (
              <div
                className={`gallery-image gallery-image-${index + 1}`}
                key={image.image}
                role="img"
                aria-label={image.description}
                style={{
                  backgroundImage: `url("https://images.unsplash.com/${image.image}?auto=format&fit=crop&w=900&q=80")`,
                }}
              />
            ))}
          </div>
        </section>

        <section className="reservation-section" id="reserve">
          <div className="reservation-inner section-wrap">
            <div className="reservation-copy">
              <p className="eyebrow"><span /> YOUR TABLE IS WAITING</p>
              <h2>Make room for <em>something good.</em></h2>
              <p className="body-copy">
                Celebrating something or just hungry? Tell us when you’re
                coming and we’ll take care of the rest.
              </p>
              <div className="reservation-detail">
                <span>✳</span>
                <p><strong>Walk-ins are always welcome.</strong><br />For evenings and weekends, a reservation is a good idea.</p>
              </div>
            </div>
            <ReservationForm
              openingHours={openingHours}
              initialDate={reservationDates.today}
              latestDate={reservationDates.lastDate}
              firstAvailableTime={reservationDates.firstAvailableTime}
            />
          </div>
        </section>

        <section className="visit-section section-wrap" id="visit">
          <div className="visit-heading">
            <div>
              <p className="eyebrow"><span /> COME ON IN</p>
              <h2>We’ll save you <em>a seat.</em></h2>
            </div>
            <a className="button button-dark" href={restaurant.phone ? `tel:${phoneLink}` : "#reserve"}>
            {restaurant.phone ? "Give us a call" : "Book online"} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="visit-grid">
            <div className="visit-card">
              <span className="visit-index">01 / FIND US</span>
              <h3>Made for getting together.</h3>
              <p>{restaurant.address || "Add your restaurant address in the admin dashboard."}</p>
              {mapUrl ? (
                <a className="underlined-link" href={mapUrl} target="_blank" rel="noreferrer">
                  Open in maps <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span className="visit-note">Add an address to enable map directions.</span>
              )}
            </div>
            <div className="visit-card">
              <span className="visit-index">02 / OPEN DOOR</span>
              <h3>Come by when you’re hungry.</h3>
              <p>{openingHours.map((hours) => (
                <span key={hours.day_of_week}>
                  {hours.label}: {hours.is_closed || !hours.open_time || !hours.close_time
                    ? "Closed"
                    : `${hours.open_time} – ${hours.close_time}`}
                  <br />
                </span>
              ))}</p>
              <a className="underlined-link" href="#reserve">
                Plan your visit <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="visit-map">
              {restaurant.address ? (
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(restaurant.address)}&output=embed`}
                  title={`Map showing ${restaurant.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="map-empty map-empty-home">
                  <p className="eyebrow">PLAN YOUR VISIT</p>
                  <h3>A warm welcome is waiting.</h3>
                  <p>Our location details are being updated. You can still reserve your table online.</p>
                  <a className="button button-gold" href="#reserve">
                    Book online <span aria-hidden="true">↗</span>
                  </a>
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
