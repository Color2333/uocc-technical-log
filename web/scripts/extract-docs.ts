import * as fs from "fs";
import * as path from "path";

interface ChapterMeta {
  id: string;
  title: string;
  subtitle: string;
  layer: string;
  doc: string;
}

const WEB_DIR = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(WEB_DIR, "..", "docs");
const OUT_DIR = path.join(WEB_DIR, "src", "data", "generated");

interface DocEntry {
  version: string;
  locale: string;
  title: string;
  content: string;
}

function main() {
  const metaPath = path.join(DOCS_DIR, "_meta.json");

  if (!fs.existsSync(metaPath)) {
    console.error(`_meta.json not found: ${metaPath}`);
    console.error("Please create docs/_meta.json with chapter definitions");
    return;
  }

  const chapters: ChapterMeta[] = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  console.log(`Found ${chapters.length} chapters in _meta.json`);

  const docs: DocEntry[] = [];
  const locales = ["zh", "en"];

  for (const chapter of chapters) {
    const docPath = path.join(DOCS_DIR, chapter.doc);

    if (!fs.existsSync(docPath)) {
      console.warn(`  Doc not found: ${chapter.doc}`);
      continue;
    }

    const content = fs.readFileSync(docPath, "utf-8");

    for (const locale of locales) {
      docs.push({
        version: chapter.id,
        locale,
        title: `${chapter.id}: ${chapter.title}`,
        content,
      });
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const docsPath = path.join(OUT_DIR, "docs.json");
  fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2));
  console.log(`  Wrote ${docsPath}`);

  const versions = chapters.map((ch) => ({
    id: ch.id,
    filename: `${ch.id}.md`,
    title: ch.title,
    subtitle: ch.subtitle,
    loc: 0,
    tools: [] as string[],
    newTools: [] as string[],
    coreAddition: ch.title,
    keyInsight: ch.subtitle,
    classes: [] as { name: string; startLine: number; endLine: number }[],
    functions: [] as { name: string; signature: string; startLine: number }[],
    layer: ch.layer,
    source: "",
  }));

  const diffs = chapters.slice(1).map((ch, i) => ({
    from: chapters[i].id,
    to: ch.id,
    newClasses: [] as string[],
    newFunctions: [] as string[],
    newTools: [] as string[],
    locDelta: 0,
  }));

  const versionsPath = path.join(OUT_DIR, "versions.json");
  fs.writeFileSync(versionsPath, JSON.stringify({ versions, diffs }, null, 2));
  console.log(`  Wrote ${versionsPath}`);

  console.log("\nExtraction complete:");
  for (const ch of chapters) {
    console.log(`    ${ch.id}: ${ch.title}`);
  }
}

main();
