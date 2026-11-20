import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Catraca de i18n: conta texto de UI escrito fora dos dicionários (`i18n/`). O número só pode
 * descer: se passar, o teste lista os ofensores; se ficar abaixo, obriga a baixar a constante no
 * mesmo commit. A meta da F7b é 0 (tarefa 28) com `COPY_ALLOWLIST` explícita.
 */
const COPY_BASELINE = 0;

/** Textos que não são copy (nome próprio, símbolo). Comparação exata com o texto aparado. */
const COPY_ALLOWLIST: readonly string[] = [
  "Infotera Hotéis",
  // Invariantes do `superRefine` do request: erro de programação, nunca chega à tela.
  "Guest counts differ from the search.",
  "Child age is required.",
];

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

/**
 * Palavras de UI em português **sem acento** que não existem em inglês (lista curada: nada de
 * "data", "do", "a", "hotel", "total"). Casam por palavra inteira, sem diferenciar caixa.
 */
const PT_UI_WORDS = new Set([
  "esgotado",
  "esgotada",
  "quarto",
  "quartos",
  "hospede",
  "hospedes",
  "noite",
  "noites",
  "diaria",
  "diarias",
  "reserva",
  "reservas",
  "reservar",
  "buscar",
  "busca",
  "favorito",
  "favoritos",
  "favoritar",
  "comparar",
  "comparacao",
  "historico",
  "disponivel",
  "indisponivel",
  "disponiveis",
  "preco",
  "precos",
  "avaliacao",
  "avaliacoes",
  "filtro",
  "filtros",
  "ordenar",
  "limpar",
  "voltar",
  "proximo",
  "proxima",
  "anterior",
  "confirmar",
  "confirmacao",
  "cancelar",
  "cancelamento",
  "gratis",
  "mostrar",
  "fechar",
  "carregando",
  "tentar",
  "entrada",
  "saida",
  "adulto",
  "adultos",
  "crianca",
  "criancas",
  "telefone",
  "pagamento",
  "cartao",
  "obrigatorio",
  "invalido",
  "pesquisar",
  "destino",
  "destinos",
  "cidade",
  "viagem",
  "hoteis",
  "comodidades",
  "todos",
  "nenhum",
  "nenhuma",
]);

type Offender = {
  file: string;
  line: number;
  text: string;
  kind: "jsx" | "attribute" | "literal" | "label" | "route";
};

const isAllowed = (text: string): boolean => COPY_ALLOWLIST.includes(text.trim());

const hasWord = (text: string): boolean => /[A-Za-zÀ-ÿ]{2}/.test(text) && !isAllowed(text);

const hasLetters = (text: string): boolean => LETTERS.test(text) && !isAllowed(text);

/** Âncora/id em kebab-case minúsculo (`quartos`, `reserva-confirmada`): identificador, não copy. */
const SLUG = /^#?[a-z0-9]+(?:-[a-z0-9]+)*$/;

const hasPortugueseUiWord = (text: string): boolean =>
  !SLUG.test(text) &&
  text
    .toLowerCase()
    .split(/[^a-zà-ÿ]+/)
    .some((word) => PT_UI_WORDS.has(word));

const looksPortuguese = (text: string): boolean =>
  (ACCENTED.test(text) || PT_WORDS.test(text) || hasPortugueseUiWord(text)) && !isAllowed(text);

const attributeName = (node: ts.Node): string | null => {
  const parent = node.parent;
  if (ts.isJsxAttribute(parent)) return parent.name.getText();
  if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)) {
    return parent.parent.name.getText();
  }
  return null;
};

/** Propriedades de objeto que carregam rótulo visível: o valor cru em qualquer idioma é copy. */
const LABEL_PROPERTIES = new Set([
  "label",
  "title",
  "description",
  "text",
  "message",
  "hint",
  "heading",
  "caption",
  "summary",
  "placeholder",
  "ariaLabel",
  "alt",
]);

/** Texto de rótulo escrito à mão começa em maiúscula (classe do Tailwind e chave não). */
const looksLikeLabel = (text: string): boolean => /^[A-ZÀ-Þ]/.test(text.trim());

/** `{ label: "Close" }`: propriedade de rótulo com texto cru. */
const isLabelProperty = (node: ts.Node): boolean =>
  ts.isPropertyAssignment(node.parent) &&
  node.parent.initializer === node &&
  LABEL_PROPERTIES.has(node.parent.name.getText());

/** `{"Close"}` como filho de JSX (fora de atributo): texto escondido numa expressão. */
const isJsxChildExpression = (node: ts.Node): boolean =>
  ts.isJsxExpression(node.parent) && !ts.isJsxAttribute(node.parent.parent);

const ROUTE_CALLS = new Set(["push", "replace", "prefetch", "replaceState", "pushState"]);
const ROUTE_BUILDERS = new Set(["hotelHref", "searchHref"]);
const ROUTE_CONSTANT = /(?:^|_)(?:PATH|HREF)$/;

/** Caminho interno cru: `/search`, `/` ou `/hotel/${id}` (não `//host`, `#x`, `https:`). */
const isInternalRoute = (text: string): boolean => /^\/(?!\/)/.test(text);

/** Expressão usada direta como rota, sem `localizePath`: o texto que a denuncia (ou `null`). */
const rawRoute = (expression: ts.Expression): string | null => {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return isInternalRoute(expression.text) ? expression.text : null;
  }
  if (ts.isTemplateExpression(expression)) {
    return isInternalRoute(expression.head.text) ? expression.head.text : null;
  }
  if (ts.isIdentifier(expression)) {
    return ROUTE_CONSTANT.test(expression.text) ? expression.text : null;
  }
  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
    return ROUTE_BUILDERS.has(expression.expression.text)
      ? `${expression.expression.text}(...)`
      : null;
  }
  return null;
};

const calleeName = (call: ts.CallExpression): string =>
  ts.isPropertyAccessExpression(call.expression)
    ? call.expression.name.text
    : ts.isIdentifier(call.expression)
      ? call.expression.text
      : "";

/**
 * Rota que escapa do `localizePath`: literal `/...`, constante `*_PATH`/`*_HREF` ou `hotelHref(...)`
 * usados direto em `href`/`push`/`replace`/`replaceState`. Em inglês isso tira a pessoa de `/en`.
 */
const classifyRoute = (node: ts.Node): string | null => {
  if (ts.isJsxAttribute(node) && node.name.getText() === "href" && node.initializer) {
    const value = ts.isJsxExpression(node.initializer)
      ? node.initializer.expression
      : node.initializer;
    return value && !ts.isJsxExpression(value) ? rawRoute(value) : null;
  }
  if (!ts.isCallExpression(node)) return null;
  const callee = calleeName(node);
  if (!ROUTE_CALLS.has(callee)) return null;
  const target = node.arguments[callee.endsWith("State") ? 2 : 0];
  return target ? rawRoute(target) : null;
};

const isModuleSpecifier = (node: ts.Node): boolean =>
  ts.isImportDeclaration(node.parent) ||
  ts.isExportDeclaration(node.parent) ||
  (ts.isLiteralTypeNode(node.parent) && ts.isImportTypeNode(node.parent.parent));

type Hit = { text: string; kind: Offender["kind"] } | null;

const isTextNode = (node: ts.Node): node is ts.StringLiteralLike | ts.TemplateLiteralToken =>
  ts.isStringLiteral(node) ||
  ts.isNoSubstitutionTemplateLiteral(node) ||
  ts.isTemplateHead(node) ||
  ts.isTemplateMiddle(node) ||
  ts.isTemplateTail(node);

/** Literal de texto: rótulo de objeto, filho de JSX, atributo de copy ou português solto. */
const classifyLiteral = (node: ts.StringLiteralLike | ts.TemplateLiteralToken): Hit => {
  const { text } = node;
  if (isLabelProperty(node)) {
    return hasLetters(text) && looksLikeLabel(text) ? { text, kind: "label" } : null;
  }
  if (isJsxChildExpression(node)) return hasWord(text) ? { text, kind: "jsx" } : null;
  const attribute = attributeName(node);
  if (attribute !== null && COPY_ATTRIBUTES.has(attribute)) {
    return hasLetters(text) ? { text, kind: "attribute" } : null;
  }
  return looksPortuguese(text) ? { text, kind: "literal" } : null;
};

/** Classifica um nó como texto de UI fora do dicionário (ou `null`). */
const classify = (node: ts.Node): Hit => {
  if (ts.isJsxText(node)) {
    return hasLetters(node.text) ? { text: node.text.trim(), kind: "jsx" } : null;
  }
  return isTextNode(node) && !isModuleSpecifier(node) ? classifyLiteral(node) : null;
};

/** Ofensores de um arquivo (função pura: recebe o nome e o conteúdo). */
const scanSource = (fileName: string, content: string): Offender[] => {
  const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
  const found: Offender[] = [];
  const visit = (node: ts.Node): void => {
    const route = classifyRoute(node);
    if (route) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push({ file: fileName, line: line + 1, text: route, kind: "route" });
    }
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

const IGNORED = [/\.test\.tsx?$/, /(^|\/)i18n\//, /(^|\/)testing\//, /\.d\.ts$/];

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

  it("conta literais com palavra de UI em português sem acento", () => {
    expect(scanSource("x.ts", 'export const a = "Esgotado";')).toHaveLength(1);
    expect(scanSource("x.ts", 'export const a = "Quartos";')).toHaveLength(1);
    expect(scanSource("x.ts", 'export const a = "H\u00f3spedes";')).toHaveLength(1);
    expect(scanSource("x.ts", 'export const a = "Sold out";')).toHaveLength(0);
    expect(scanSource("x.ts", 'export const a = "reserva-confirmada";')).toHaveLength(0);
    expect(scanSource("x.ts", 'export const a = "data";')).toHaveLength(0);
    expect(scanSource("x.ts", 'export const a = "do";')).toHaveLength(0);
  });

  it("conta inglês cru em expressão JSX e em objetos de rótulos", () => {
    expect(tsx('const A = () => <button>{"Close"}</button>;')).toHaveLength(1);
    expect(tsx('const A = () => <p>{"·"}</p>;')).toHaveLength(0);
    expect(scanSource("x.ts", 'export const a = { label: "Close dialog" };')).toHaveLength(1);
    expect(scanSource("x.ts", 'export const a = { title: "Rooms" };')).toHaveLength(1);
    expect(scanSource("x.ts", 'export const a = { label: "close" };')).toHaveLength(0);
    expect(scanSource("x.ts", 'export const a = { kind: "Close dialog" };')).toHaveLength(0);
  });

  it("conta rota que escapa do localizePath (tira a pessoa de /en)", () => {
    expect(tsx('const A = () => <Link href="/search" />;')).toHaveLength(1);
    expect(tsx('const A = () => <Link href={"/"} />;')).toHaveLength(1);
    expect(tsx("const A = () => <Link href={`/hotel/$" + "{id}`} />;")).toHaveLength(1);
    expect(tsx("const A = () => <Link href={FAVORITES_PATH} />;")).toHaveLength(1);
    expect(tsx("const A = () => <Link href={hotelHref(1, null)} />;")).toHaveLength(1);
    expect(scanSource("x.ts", 'router.push("/compare");')).toHaveLength(1);
    expect(scanSource("x.ts", "router.replace(`/x?$" + "{q}`);")).toHaveLength(1);
    expect(scanSource("x.ts", 'window.history.replaceState(null, "", "/compare");')).toHaveLength(
      1,
    );
    expect(tsx('const A = () => <Link href={localizePath(locale, "/")} />;')).toHaveLength(0);
    expect(tsx('const A = () => <a href="#quartos" />;')).toHaveLength(0);
    expect(tsx('const A = () => <a href="https://x.org" />;')).toHaveLength(0);
    expect(scanSource("x.ts", "router.push(localizePath(locale, FAVORITES_PATH));")).toHaveLength(
      0,
    );
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
