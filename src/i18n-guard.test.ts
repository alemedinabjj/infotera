import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Catraca de i18n: conta texto de UI escrito fora dos dicionários (`i18n/`). O número só pode
 * descer: se passar, o teste lista os ofensores; se ficar abaixo, obriga a baixar a constante no
 * mesmo commit. A meta da F7b é 0 (tarefa 28) com `COPY_ALLOWLIST` explícita.
 */
const COPY_BASELINE = 442;

/** Textos que não são copy (nome próprio, símbolo). Comparação exata com o texto aparado. */
const COPY_ALLOWLIST: readonly string[] = ["Infotera Hotéis"];

const SRC_DIR = path.resolve(__dirname);
const COPY_ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "placeholder",
  "title",
  "alt",
]);
const LETTERS = /[A-Za-zÀ-ÿ]/;
const ACCENTED = /[ãõçáéíóúâêôàü]/i;
const PT_WORDS = /(?:^|\s)(?:de|para|com|sem|em|por|do|da|dos|das|ou)\s|(?:^|\s)n[ãa]o(?:\s|$)/i;

type Offender = { file: string; line: number; text: string; kind: "jsx" | "attribute" | "literal" };

const isAllowed = (text: string): boolean => COPY_ALLOWLIST.includes(text.trim());

const hasLetters = (text: string): boolean => LETTERS.test(text) && !isAllowed(text);

const looksPortuguese = (text: string): boolean =>
  (ACCENTED.test(text) || PT_WORDS.test(text)) && !isAllowed(text);

const attributeName = (node: ts.Node): string | null => {
  const parent = node.parent;
  if (ts.isJsxAttribute(parent)) return parent.name.getText();
  if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)) {
    return parent.parent.name.getText();
  }
  return null;
};

const isModuleSpecifier = (node: ts.Node): boolean =>
  ts.isImportDeclaration(node.parent) ||
  ts.isExportDeclaration(node.parent) ||
  (ts.isLiteralTypeNode(node.parent) && ts.isImportTypeNode(node.parent.parent));

/** Classifica um nó como texto de UI fora do dicionário (ou `null`). */
const classify = (node: ts.Node): { text: string; kind: Offender["kind"] } | null => {
  if (ts.isJsxText(node)) {
    return hasLetters(node.text) ? { text: node.text.trim(), kind: "jsx" } : null;
  }
  const isTextNode =
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node);
  if (!isTextNode || isModuleSpecifier(node)) return null;
  const attribute = attributeName(node);
  if (attribute !== null && COPY_ATTRIBUTES.has(attribute)) {
    return hasLetters(node.text) ? { text: node.text, kind: "attribute" } : null;
  }
  return looksPortuguese(node.text) ? { text: node.text, kind: "literal" } : null;
};

/** Ofensores de um arquivo (função pura: recebe o nome e o conteúdo). */
const scanSource = (fileName: string, content: string): Offender[] => {
  const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
  const found: Offender[] = [];
  const visit = (node: ts.Node): void => {
    const hit = classify(node);
    if (hit) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push({ file: fileName, line: line + 1, ...hit });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

const IGNORED = [
  /\.test\.tsx?$/,
  /(^|\/)i18n\//,
  /(^|\/)testing\//,
  /(^|\/)app\/sw\.ts$/,
  /\.d\.ts$/,
];

const sourceFiles = (): string[] =>
  readdirSync(SRC_DIR, { recursive: true, encoding: "utf8" })
    .map((entry) => entry.split(path.sep).join("/"))
    .filter((entry) => /\.tsx?$/.test(entry) && !IGNORED.some((rule) => rule.test(entry)));

const scanAll = (): Offender[] =>
  sourceFiles().flatMap((file) =>
    scanSource(`src/${file}`, readFileSync(path.join(SRC_DIR, file), "utf8")),
  );

describe("scanSource", () => {
  const tsx = (code: string) => scanSource("x.tsx", code);

  it("conta texto JSX com letras e ignora símbolos e números", () => {
    expect(tsx("const A = () => <p>Olá, mundo</p>;")).toHaveLength(1);
    expect(tsx("const A = () => <p>·</p>;")).toHaveLength(0);
    expect(tsx("const A = () => <p>{'R$'} 12</p>;")).toHaveLength(0);
  });

  it("conta atributos de texto com letras (string e expressão)", () => {
    expect(tsx('const A = () => <input aria-label="Nome" />;')).toHaveLength(1);
    expect(tsx("const A = () => <img alt={'Foto'} />;")).toHaveLength(1);
    expect(tsx('const A = () => <div className="mt-2" data-x="abc" />;')).toHaveLength(0);
    expect(tsx('const A = () => <input placeholder="" />;')).toHaveLength(0);
  });

  it("conta literais com acento ou palavra funcional do português", () => {
    expect(scanSource("x.ts", 'export const a = "Não disponível";')).toHaveLength(1);
    expect(scanSource("x.ts", 'export const a = "quartos para hoje";')).toHaveLength(1);
    expect(scanSource("x.ts", "export const a = `Total de \u0024{n}`;")).toHaveLength(1);
    expect(scanSource("x.ts", 'export const a = "hotel-details";')).toHaveLength(0);
    expect(scanSource("x.ts", 'import { a } from "@/shared/é";')).toHaveLength(0);
  });

  it("ignora comentários e usa a linha do nó", () => {
    const [hit] = scanSource("x.ts", '// Não conta\n\nexport const a = "Não";');
    expect(hit?.line).toBe(3);
  });
});

describe("catraca de texto fora do dicionário", () => {
  it("a contagem é exatamente COPY_BASELINE", () => {
    const offenders = scanAll();
    const summary = offenders
      .slice(0, Number(process.env.GUARD_LIST ?? 40))
      .map((item) => `${item.file}:${item.line} [${item.kind}] ${item.text}`)
      .join("\n");
    expect(
      offenders.length,
      `COPY_BASELINE = ${COPY_BASELINE}, encontrado ${offenders.length}. ` +
        `Mova o texto para i18n/ (ou baixe a constante se a contagem caiu).\n${summary}`,
    ).toBe(COPY_BASELINE);
  });
});
