import Link from "next/link";
import { getRestaurantInfo } from "@/lib/data";

export function SiteHeader() {
  const restaurant = getRestaurantInfo();
  const initial = restaurant.name.trim().charAt(0) || "A";

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={`${restaurant.name} home`}>
        <span className="brand-mark">{initial}</span>
        <span className="brand-name">{restaurant.name.toUpperCase()} <span>{restaurant.tagline.toUpperCase()}</span></span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/#story">Our story</Link>
        <Link href="/menu">The menu</Link>
        <Link href="/#moments">Gallery</Link>
        <Link href="/contact">Find us</Link>
      </nav>
      <Link className="header-book" href="/#reserve">Book a table <span aria-hidden="true">↗</span></Link>
    </header>
  );
}

export function SiteFooter() {
  const restaurant = getRestaurantInfo();
  const initial = restaurant.name.trim().charAt(0) || "A";

  return (
    <footer className="site-footer">
      <div className="footer-main section-wrap">
        <Link className="brand footer-brand" href="/" aria-label={`${restaurant.name} home`}>
          <span className="brand-mark">{initial}</span>
          <span className="brand-name">{restaurant.name.toUpperCase()} <span>{restaurant.tagline.toUpperCase()}</span></span>
        </Link>
        <p>{restaurant.tagline}</p>
        <Link href="/#reserve" className="footer-book">Come find your seat <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="footer-bottom section-wrap">
        <span>© {restaurant.name}</span>
        <span>MADE WITH CARE, SERVED WITH LOVE</span>
        <Link href="/admin/login">Staff sign in</Link>
      </div>
    </footer>
  );
}
