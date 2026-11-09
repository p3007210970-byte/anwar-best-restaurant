import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { getMenuCategories, getPublicMenu } from "@/lib/data";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Our menu | Anwar Best Restaurant",
  description: "Explore freshly prepared Pakistani favourites from the Anwar Best Restaurant kitchen.",
};
export const instant = false;

export default async function MenuPage() {
  await connection();
  const categories = getMenuCategories();
  const items = getPublicMenu();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="inner-page-intro">
          <p className="eyebrow"><span /> FRESH FROM OUR KITCHEN</p>
          <h1>Made to be <em>shared.</em></h1>
          <p>Every dish is prepared fresh with honest ingredients and the kind of care you can taste.</p>
        </section>
        <section className="full-menu section-wrap">
          {categories.map((category) => {
            const categoryItems = items.filter((item) => item.category_id === category.id);
            if (categoryItems.length === 0) return null;

            return (
              <section className="full-menu-category" id={category.id} key={category.id}>
                <h2>{category.name}</h2>
                <div className="full-menu-grid">
                  {categoryItems.map((item) => (
                    <article className="full-menu-item" key={item.id}>
                      {item.image_url ? (
                        <div className="full-menu-image" role="img" aria-label={item.name} style={{ backgroundImage: `url("${item.image_url}")` }} />
                      ) : (
                        <div className="full-menu-image full-menu-image-empty" aria-hidden="true">A</div>
                      )}
                      <div className="full-menu-item-copy">
                        <div><h3>{item.name}</h3><span>PKR {item.price.toLocaleString("en-PK")}</span></div>
                        <p>{item.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
          {items.length === 0 && <p className="menu-footnote">Our menu is being prepared. Please check back soon.</p>}
          <div className="menu-cta">
            <p>Found something you fancy?</p>
            <Link className="button button-dark" href="/#reserve">Save your seat <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
