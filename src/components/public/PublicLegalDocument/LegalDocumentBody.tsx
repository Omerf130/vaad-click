import type {
  LegalContentBlock,
  LegalContentSection,
} from "@/content/legal/legal-document-types";
import styles from "./LegalDocumentBody.module.scss";

type Props = {
  sections: readonly LegalContentSection[];
};

function LegalBlockView({ block }: { block: LegalContentBlock }) {
  if (block.type === "paragraph") {
    return <p className={styles.paragraph}>{block.text}</p>;
  }

  const ListTag = block.ordered ? "ol" : "ul";
  return (
    <ListTag className={styles.list}>
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ListTag>
  );
}

function sectionHeadingId(number: string, title?: string): string {
  const slug = title
    ? title.replace(/\s+/g, "-").replace(/[^\w\u0590-\u05FF-]/g, "")
    : "section";
  return `legal-section-${number}-${slug}`;
}

export function LegalDocumentBody({ sections }: Props) {
  return (
    <div className={styles.root}>
      {sections.map((section) => {
        const headingId = sectionHeadingId(section.number, section.title);
        const headingText = section.title
          ? `${section.number}. ${section.title}`
          : section.number;
        const HeadingTag = section.headingLevel === 3 ? "h3" : "h2";
        const headingClass =
          section.headingLevel === 3 ? styles.subsectionHeading : styles.sectionHeading;

        return (
          <section
            key={`${section.number}-${section.title ?? ""}`}
            className={styles.section}
            aria-labelledby={headingId}
          >
            <HeadingTag id={headingId} className={headingClass}>
              {headingText}
            </HeadingTag>
            {section.blocks.map((block, index) => (
              <LegalBlockView key={`${section.number}-block-${index}`} block={block} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
