export type LegalContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: readonly string[] };

/** Numbered section or subsection from lawyer-supplied documents. */
export type LegalContentSection = {
  /** e.g. "1", "5.6" — preserved from counsel numbering */
  number: string;
  title?: string;
  /** Main chapter headings use 2; clauses like 1.1 use 3. */
  headingLevel?: 2 | 3;
  blocks: readonly LegalContentBlock[];
};

export type LawyerSuppliedLegalBody = {
  documentHeading: string;
  sections: readonly LegalContentSection[];
};
