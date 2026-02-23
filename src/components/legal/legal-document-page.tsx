import Link from "next/link";
import type { LegalDocument } from "@/src/content/legal/types";
import { PageContainer } from "@/src/components/layout/page-container";

interface LegalDocumentPageProps {
  document: LegalDocument;
}

const LEGAL_LINK_TOKEN_PATTERN =
  /(https?:\/\/[^\s]+|\/contact|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const LEGAL_LINK_DETECT_PATTERN =
  /(https?:\/\/[^\s]+|\/contact|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/;
const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?]+$/;

function splitTrailingPunctuation(value: string) {
  const match = value.match(TRAILING_PUNCTUATION_PATTERN);
  if (!match || match.index === undefined) {
    return { core: value, trailing: "" };
  }

  return {
    core: value.slice(0, match.index),
    trailing: value.slice(match.index),
  };
}

function renderLegalParagraph(paragraph: string) {
  if (!LEGAL_LINK_DETECT_PATTERN.test(paragraph)) {
    return paragraph;
  }

  const tokens = paragraph.split(LEGAL_LINK_TOKEN_PATTERN);
  return tokens.map((token, index) => {
    if (token === "/contact") {
      return (
        <Link key={`contact-link-${index}`} href="/contact" className="link-subtle focus-ring">
          /contact
        </Link>
      );
    }

    if (token.startsWith("http://") || token.startsWith("https://")) {
      const { core, trailing } = splitTrailingPunctuation(token);
      return (
        <span key={`external-link-${index}`}>
          <a
            href={core}
            target="_blank"
            rel="noreferrer noopener"
            className="link-subtle focus-ring wrap-break-word"
          >
            {core}
          </a>
          {trailing}
        </span>
      );
    }

    if (token.includes("@")) {
      const { core, trailing } = splitTrailingPunctuation(token);
      return (
        <span key={`email-link-${index}`}>
          <a href={`mailto:${core}`} className="link-subtle focus-ring wrap-break-word">
            {core}
          </a>
          {trailing}
        </span>
      );
    }

    return <span key={`text-${index}`}>{token}</span>;
  });
}

export function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  return (
    <div className="py-16 sm:py-20">
      <PageContainer className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <article className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {document.meta.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {document.meta.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {document.meta.subtitle}
          </p>

          <div className="mt-5 rounded-lg border border-border bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
            <dl className="grid gap-1">
              <div className="flex flex-wrap gap-1">
                <dt className="font-medium text-foreground">Effective date:</dt>
                <dd>{document.meta.effectiveDate}</dd>
              </div>
              <div className="flex flex-wrap gap-1">
                <dt className="font-medium text-foreground">Last updated:</dt>
                <dd>{document.meta.lastUpdated}</dd>
              </div>
            </dl>
          </div>

          <nav
            aria-label={`${document.meta.title} sections`}
            className="mt-7 rounded-xl border border-border p-4 lg:hidden"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              On this page
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {document.sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="link-subtle focus-ring text-sm">
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8 space-y-8">
            {document.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-[calc(var(--site-header-h)+1rem)] border-t border-border pt-6 first:border-t-0 first:pt-0"
              >
                <h2 className="text-xl font-semibold tracking-tight">
                  <a
                    href={`#${section.id}`}
                    className="group inline-flex items-start gap-2 rounded-sm focus-ring"
                    aria-label={`Link to section ${index + 1}: ${section.title}`}
                  >
                    <span>
                      {index + 1}. {section.title}
                    </span>
                    <span
                      aria-hidden="true"
                      className="pt-0.5 text-xs text-muted-foreground opacity-0 transition-opacity motion-reduce:transition-none group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      #
                    </span>
                  </a>
                </h2>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={`${section.id}-paragraph-${paragraphIndex}`}
                    className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base"
                  >
                    {renderLegalParagraph(paragraph)}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>

        <aside className="hidden lg:block lg:self-stretch">
          <div className="sticky top-[calc(var(--site-header-h)+1rem)] rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              On this page
            </p>
            <nav aria-label={`${document.meta.title} sections`}>
              <ul className="mt-3 space-y-2">
                {document.sections.map((section, index) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="link-subtle focus-ring text-sm">
                      {index + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
      </PageContainer>
    </div>
  );
}
