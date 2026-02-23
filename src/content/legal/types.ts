export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocumentMeta {
  eyebrow: string;
  title: string;
  subtitle: string;
  effectiveDate: string;
  lastUpdated: string;
}

export interface LegalDocument {
  meta: LegalDocumentMeta;
  sections: LegalSection[];
}
