import Link from "next/link";
import { PageContainer } from "@/src/components/layout/page-container";
import {
  LEGAL_CONTACT_ADDRESS,
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTROLLER_NAME,
  LEGAL_DPO_CONTACT,
} from "@/src/content/legal/legal-metadata";

export default function ContactPage() {
  return (
    <div className="py-16 sm:py-20">
      <PageContainer size="narrow" className="space-y-6">
        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Contact
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Get in touch</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            For product questions, implementation discussions, and legal/privacy requests, use the
            contact details below.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Legal and privacy contact</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:text-base">
            <div>
              <dt className="font-medium text-foreground">Controller</dt>
              <dd className="text-muted-foreground">{LEGAL_CONTROLLER_NAME}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Email</dt>
              <dd>
                <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="link-subtle focus-ring">
                  {LEGAL_CONTACT_EMAIL}
                </a>
              </dd>
            </div>
            {LEGAL_CONTACT_ADDRESS ? (
              <div>
                <dt className="font-medium text-foreground">Postal address</dt>
                <dd className="text-muted-foreground">{LEGAL_CONTACT_ADDRESS}</dd>
              </div>
            ) : null}
            {LEGAL_DPO_CONTACT ? (
              <div>
                <dt className="font-medium text-foreground">DPO / representative</dt>
                <dd className="text-muted-foreground">{LEGAL_DPO_CONTACT}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Related legal documents</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/privacy" className="btn-secondary btn-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="btn-secondary btn-sm">
              Terms and Conditions
            </Link>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
