import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceFolder = path.join(projectRoot, "sections");
const templatePath = path.join(projectRoot, "src", "template.html");
const outputPath = path.join(projectRoot, "index.html");
const sectionIds = [
  "home",
  "about",
  "education",
  "skills",
  "projects",
  "programming",
  "achievements",
  "certificates",
  "gallery",
  "contact",
];

async function splitCurrentPage() {
  let template = await readFile(outputPath, "utf8");

  for (const id of sectionIds) {
    const openingTag = new RegExp(`<section\\b(?=[^>]*\\bid="${id}")[^>]*>`, "g");
    const match = openingTag.exec(template);

    if (!match) {
      throw new Error(`Could not find the "${id}" section in index.html.`);
    }

    const sectionTags = /<\/?section\b[^>]*>/g;
    const sectionSource = template.slice(match.index);
    let depth = 0;
    let sectionEnd = -1;

    for (const tag of sectionSource.matchAll(sectionTags)) {
      if (tag[0].startsWith("</")) {
        depth -= 1;
        if (depth === 0) {
          sectionEnd = match.index + tag.index + tag[0].length;
          break;
        }
      } else {
        depth += 1;
      }
    }

    if (sectionEnd < 0) {
      throw new Error(`Could not find the closing tag for "${id}".`);
    }

    const sectionMarkup = template.slice(match.index, sectionEnd);
    await writeFile(path.join(sourceFolder, `${id}.html`), sectionMarkup);
    template = `${template.slice(0, match.index)}{{section:${id}}}${template.slice(sectionEnd)}`;
  }

  await writeFile(templatePath, template);
}

async function buildPage() {
  let template;

  try {
    template = await readFile(templatePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    throw new Error("Page template is missing. Run `node build.mjs --split` first.");
  }

  for (const id of sectionIds) {
    const sectionPath = path.join(sourceFolder, `${id}.html`);
    let section;

    try {
      section = await readFile(sectionPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      throw new Error(`Section file is missing: sections/${id}.html`);
    }

    const placeholder = `{{section:${id}}}`;
    if (!template.includes(placeholder)) {
      throw new Error(`Section placeholder is missing: ${placeholder}`);
    }

    template = template.replace(placeholder, section);
  }

  const remainingPlaceholder = template.match(/\{\{section:[^}]+\}\}/);
  if (remainingPlaceholder) {
    throw new Error(`Unknown section placeholder: ${remainingPlaceholder[0]}`);
  }

  await writeFile(outputPath, template);
}

try {
  await mkdir(sourceFolder, { recursive: true });
  await mkdir(path.dirname(templatePath), { recursive: true });

  if (process.argv.includes("--split")) {
    await splitCurrentPage();
  }

  await buildPage();
  console.log("Portfolio built successfully: index.html");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
