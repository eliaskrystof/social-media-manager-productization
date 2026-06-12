import Link from "next/link";
import { getBrands } from "@/lib/workspace-data";
import { createBrandAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <main className="shell">
      <section className="page-heading">
        <p className="eyebrow">Brand workspace</p>
        <h1>Brands</h1>
        <p className="lede">Manage brand context first, then work with content inside each brand.</p>
      </section>

      <section className="panel wide">
        <div className="section-title">
          <div>
            <p className="label">Onboard brand</p>
            <h2>Create a brand profile</h2>
          </div>
        </div>
        <form action={createBrandAction} className="content-form create-brand-form">
          <label>
            Brand name
            <input name="name" required />
          </label>
          <label>
            Website
            <input name="websiteUrl" type="url" />
          </label>
          <label>
            Default language
            <input name="defaultLanguage" placeholder="en" />
          </label>
          <label className="wide-field">
            Description
            <textarea name="description" rows={3} />
          </label>
          <button className="button" type="submit">
            Create brand
          </button>
        </form>
      </section>

      <section className="list">
        {brands.map((brand) => (
          <article className="row-card" key={brand.id}>
            <div>
              <p className="label">{brand.status}</p>
              <h2>
                <Link href={`/brands/${brand.id}`}>{brand.name}</Link>
              </h2>
              <p>{brand.profile?.description ?? "No brand profile description yet."}</p>
            </div>
            <dl className="facts">
              <div>
                <dt>Language</dt>
                <dd>{brand.defaultLanguage ?? "not set"}</dd>
              </div>
              <div>
                <dt>Content</dt>
                <dd>{brand.contentCount}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <dd>{brand.websiteUrl ?? "not set"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
