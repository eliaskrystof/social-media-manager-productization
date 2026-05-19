import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandContentList } from "@/lib/workspace-data";
import { createContentItemAction } from "./actions";

export const dynamic = "force-dynamic";

type BrandContentPageProps = {
  params: Promise<{
    brandId: string;
  }>;
};

export default async function BrandContentPage({ params }: BrandContentPageProps) {
  const { brandId } = await params;
  const contentList = await getBrandContentList(brandId);

  if (!contentList.ok) {
    notFound();
  }

  return (
    <main className="shell">
      <section className="page-heading">
        <p className="eyebrow">Content</p>
        <h1>{contentList.brand.name}</h1>
        <p className="lede">Brand-scoped content is the primary path for planning and editing.</p>
        <div className="actions">
          <Link className="button secondary" href={`/brands/${contentList.brand.id}`}>
            Brand detail
          </Link>
        </div>
      </section>

      <section className="panel content-create-panel">
        <div>
          <p className="label">New content</p>
          <h2>Create draft</h2>
          <p>Creates one brand-owned content item and default publishing outputs for Instagram, Facebook, and LinkedIn.</p>
        </div>
        <form action={createContentItemAction} className="content-form">
          <input name="brandId" type="hidden" value={contentList.brand.id} />
          <label>
            Title
            <input name="title" placeholder="May campaign launch" required />
          </label>
          <label>
            Brief
            <textarea name="brief" placeholder="Goal, audience, offer, constraints..." rows={3} />
          </label>
          <label>
            Master content
            <textarea name="masterContent" placeholder="Initial copy, notes, or source text..." rows={5} />
          </label>
          <label>
            Media
            <input disabled name="media" type="file" />
          </label>
          <p className="form-note">Media input is prepared as a stub for the next storage step.</p>
          <label>
            Language
            <input name="language" placeholder={contentList.brand.defaultLanguage ?? "en"} />
          </label>
          <button className="button" type="submit">
            Create content
          </button>
        </form>
      </section>

      <section className="list">
        {contentList.contentItems.length > 0 ? (
          contentList.contentItems.map((contentItem) => (
            <article className="content-row" key={contentItem.id}>
              <div className="content-row-main">
                <p className="label">{contentItem.status}</p>
                <h2>
                  <Link href={`/brands/${contentList.brand.id}/content/${contentItem.id}`}>
                    {contentItem.title ?? "Untitled content"}
                  </Link>
                </h2>
                <p>{contentItem.brief ?? contentItem.masterContent ?? "No brief yet."}</p>
                <div className="meta-line">
                  <span>Updated {formatDate(contentItem.updatedAt)}</span>
                  <span>{contentItem.publicationJobCount} publication job(s)</span>
                  <span>{contentItem.latestAutomationRun?.status ?? "automation idle"}</span>
                </div>
              </div>
            <div className="variant-chip-list" aria-label="Publishing outputs">
              {contentItem.variants.map((variant) => (
                <div className="variant-chip" key={variant.id}>
                  <strong>{variant.platform}</strong>
                  <span>
                    {variant.postType} / {variant.purpose}
                  </span>
                  <span>{variant.status}</span>
                </div>
              ))}
            </div>
              <Link className="row-action" href={`/brands/${contentList.brand.id}/content/${contentItem.id}`}>
                Open
              </Link>
            </article>
          ))
        ) : (
          <article className="panel empty-state">
            <p className="label">No content yet</p>
            <h2>Start with the draft above.</h2>
            <p>The first item will appear here with draft publishing outputs already attached.</p>
          </article>
        )}
      </section>
    </main>
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
