import { MathInputError } from "./errors";

function readGroup(source: string, start: number): { value: string; end: number } {
  if (source[start] !== "{") throw new MathInputError("Expected a braced LaTeX argument.");
  let depth = 0;
  for (let index = start; index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}") depth--;
    if (depth === 0) return { value: source.slice(start + 1, index), end: index + 1 };
  }
  throw new MathInputError("This expression has an unclosed brace.");
}

function replaceBracedCommands(source: string): string {
  let result = source;
  const commandPattern = /\\(dfrac|tfrac|frac)\s*\{/;
  for (let attempts = 0; attempts < 100; attempts++) {
    const match = commandPattern.exec(result);
    if (!match || match.index === undefined) break;
    const commandStart = match.index;
    const argumentStart = commandStart + match[0].length - 1;
    const first = readGroup(result, argumentStart);
    let end = first.end;
    let secondStart = end;
    while (/\s/.test(result[secondStart] ?? "")) secondStart++;
    const second = readGroup(result, secondStart);
    end = second.end;
    const replacement = `((${first.value})/(${second.value}))`;
    result = `${result.slice(0, commandStart)}${replacement}${result.slice(end)}`;
  }
  if (commandPattern.test(result)) throw new MathInputError("TeXact could not read that fraction or root.");
  return result;
}

export function normalizeLatex(input: string): string {
  let result = input.trim();
  if (!result) throw new MathInputError("Enter a mathematical expression to calculate.");

  result = result.replace(/^\$\$([\s\S]*)\$\$$/, "$1").trim();
  result = result.replace(/^\\\[([\s\S]*)\\\]$/, "$1").trim();
  result = result.replace(/^\\\(([\s\S]*)\\\)$/, "$1").trim();
  result = result.replace(/\\left|\\right/g, "");
  result = result.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g, "\\int_$1^$2");
  for (let attempts = 0; attempts < 100; attempts++) {
    const next = result.replace(/\bsqrt\(([^()]*)\)/g, "\\sqrt{$1}");
    if (next === result) break;
    result = next;
  }
  result = result.replace(/\\(?:,|;|:|!|quad|qquad)\s*/g, " ");
  result = result.replace(/\\cdot|\\times/g, "*").replace(/\\div/g, "/");
  result = replaceBracedCommands(result);
  result = result.replace(/(?<!\\)\bpi\b/g, "\\pi").replace(/(?<!\\)\binfinity\b/g, "\\infty");
  result = result.replace(/(?<!\\)\b(sin|cos|tan|ln|log|exp)(?=\s*\()/g, (_match, name: string) => `\\${name}`);
  result = result.replace(/\\(?:mathrm|operatorname)\s*\{([^{}]+)\}/g, "$1");
  result = result.replace(/\\,/g, " ");
  result = result.replace(/\s+/g, " ").trim();
  return result;
}
