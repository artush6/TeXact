import { ComputeEngine, type Expression } from "@cortex-js/compute-engine";
import { MathInputError } from "./errors";
import { normalizeLatex } from "./latex-normalizer";
import type { MathResult, Operation } from "./types";

const engine = new ComputeEngine();
engine.timeLimit = 2_000;
const DECIMAL_PRECISION = 10;

interface DetectedInput {
  operation: Operation;
  variable?: string;
  explicitVariable?: boolean;
  expression: string;
}

function stripMathDelimiters(input: string): string {
  return input
    .trim()
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .trim();
}

function detectOperation(input: string): DetectedInput {
  const source = stripMathDelimiters(input);
  const derivativePatterns = [
    /^\\frac\s*\{\s*d\s*\}\s*\{\s*d([a-zA-Z])\s*\}\s*(.+)$/s,
    /^d\s*\/\s*d([a-zA-Z])\s*(.+)$/s,
    /^(?:diff|differentiate|derivative|derivation)\s+(?:of\s+)?(.+)$/is,
  ];
  for (let index = 0; index < derivativePatterns.length; index++) {
    const match = derivativePatterns[index].exec(source);
    if (!match) continue;
    if (index === 2) {
      const variableMatch = /^(.*?)\s+(?:with respect to\s+)?([a-zA-Z])\s*$/i.exec(match[1]);
      const body = variableMatch?.[1] ?? match[1];
      const variable = variableMatch?.[2] ?? inferVariable(body);
      return { operation: "differentiate", variable, explicitVariable: Boolean(variableMatch?.[2]), expression: body };
    }
    return { operation: "differentiate", variable: match[1], explicitVariable: true, expression: match[2] };
  }

  const primitiveMatch =
    /^(?:find\s+)?(?:the\s+)?(?:primitive|premitive|antiderivative|integral)\s+(?:of\s+)?(.+)$/is.exec(source);
  if (primitiveMatch) {
    const expression = `\\int ${primitiveMatch[1]}`;
    return { operation: "integrate", variable: inferVariable(primitiveMatch[1]), expression };
  }

  if (/\\int(?=\s|_)/.test(source)) {
    const integralVariable = /(?:\\mathrm\s*\{\s*d\s*([a-zA-Z])\s*\}|d\s*([a-zA-Z])\s*$)/.exec(source);
    return {
      operation: "integrate",
      variable: integralVariable?.[1] ?? integralVariable?.[2] ?? inferVariable(source),
      explicitVariable: Boolean(integralVariable),
      expression: source,
    };
  }

  if (/\\sum(?=\s|_)/.test(source) || /\bsum\s*\(/i.test(source)) {
    const variable = /\\sum_\{?([a-zA-Z])\s*=/.exec(source)?.[1] ?? inferVariable(source);
    return { operation: "summation", variable, expression: source };
  }
  if (/\\lim(?=\s|_)/.test(source) || /\blimit\s*\(/i.test(source)) {
    return { operation: "limit", variable: /\\lim_\{?([a-zA-Z])/.exec(source)?.[1], expression: source };
  }
  if (source.includes("=")) return { operation: "solve", variable: undefined, expression: source };
  return { operation: /[a-zA-Z]/.test(source) ? "simplify" : "evaluate", expression: source };
}

function normalizeSystemInput(input: string): string | undefined {
  const source = stripMathDelimiters(input);
  if (/\\begin\s*\{cases\}/.test(source)) return source;
  const equations = source
    .split(/;|\r?\n/)
    .map((equation) => equation.trim())
    .filter(Boolean);
  if (equations.length < 2 || equations.some((equation) => !equation.includes("="))) return undefined;
  return `\\begin{cases}${equations.join("\\\\")}\\end{cases}`;
}

function inferVariable(expression: string): string | undefined {
  try {
    const parsed = engine.parse(normalizeLatex(expression));
    const variables = parsed?.symbols.filter((symbol) => /^[a-zA-Z]$/.test(symbol)) ?? [];
    return variables.length === 1 ? variables[0] : undefined;
  } catch {
    const words = expression.match(/(?<!\\)[a-zA-Z]/g) ?? [];
    const variables = [...new Set(words.filter((word) => !["d"].includes(word)))];
    return variables.length === 1 ? variables[0] : undefined;
  }
}

export function getVariables(input: string): string[] {
  if (!input.trim()) return [];
  try {
    const detected = detectOperation(input);
    const source =
      detected.operation === "solve"
        ? (normalizeSystemInput(detected.expression) ?? detected.expression)
        : detected.expression;
    const parsed = engine.parse(normalizeLatex(source));
    return [...new Set(parsed?.symbols.filter((symbol) => /^[a-zA-Z]$/.test(symbol)) ?? [])].sort();
  } catch {
    return [];
  }
}

function compactDecimal(value: string): string | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric
    .toPrecision(DECIMAL_PRECISION)
    .replace(/(?:\.0+|(?:(\.\d*?)0+))(?=e|$)/, "$1")
    .replace("e+", "e");
}

function formatResult(
  input: string,
  normalizedInput: string,
  operation: Operation,
  expression: Expression,
  variable?: string,
  solutions?: string[],
): MathResult {
  const exact = expression.toString();
  const plain = exact.replace(/\s*===\s*/g, " = ");
  const latex = expression.toLatex();
  let decimal: string | undefined;
  if (expression.symbols.length === 0) {
    try {
      const approximation = expression.N().toString();
      if (approximation !== exact) decimal = compactDecimal(approximation);
    } catch {
      // Exact symbolic results remain useful when the engine cannot approximate them.
    }
  }
  return {
    input,
    normalizedInput,
    operation,
    exact,
    plain,
    latex,
    decimal,
    variable,
    solutions,
    timestamp: Date.now(),
  };
}

function powerSumFormula(index: string, lower: number, upper: string, power: number): string {
  const prefix = (bound: string): string => {
    if (power === 0) return `((${bound})+1)`;
    if (power === 1) return `((${bound})*((${bound})+1)/2)`;
    if (power === 2) return `((${bound})*((${bound})+1)*(2*(${bound})+1)/6)`;
    return `(((${bound})*((${bound})+1)/2)^2)`;
  };
  const lowerPrefix = lower <= 0 ? "0" : prefix(String(lower - 1));
  return `(${prefix(upper)}-${lowerPrefix})`;
}

function calculateCommonPowerSum(
  input: string,
  normalizedInput: string,
  detected: DetectedInput,
): MathResult | undefined {
  if (detected.operation !== "summation") return undefined;
  const match =
    /\\sum_\{\s*([a-zA-Z])\s*=\s*(-?\d+)\s*\}\s*\^\{\s*([^{}]+)\s*\}\s*([a-zA-Z])(?:\s*\^\s*\{?\s*([0-3])\s*\}?)?/.exec(
      detected.expression,
    );
  if (!match) return undefined;
  const [, index, lowerText, upper, term, powerText] = match;
  if (index !== term) return undefined;
  const lower = Number(lowerText);
  const power = powerText ? Number(powerText) : 1;
  if (!Number.isInteger(lower) || lower < 0 || !Number.isInteger(power) || power < 0 || power > 3) return undefined;

  const formula = powerSumFormula(index, lower, upper.trim(), power);
  const expression = engine.parse(normalizeLatex(formula));
  if (!expression || !expression.isValid) return undefined;
  return formatResult(input, normalizedInput, "summation", expression.simplify(), index);
}

export function calculate(input: string, variableOverride?: string): MathResult {
  const detected = detectOperation(input);
  const systemInput = detected.operation === "solve" ? normalizeSystemInput(detected.expression) : undefined;
  const normalizedInput = normalizeLatex(systemInput ?? detected.expression);

  try {
    const commonPowerSum = calculateCommonPowerSum(input, normalizedInput, detected);
    if (commonPowerSum) return commonPowerSum;

    if (detected.operation === "differentiate") {
      const variable = variableOverride ?? detected.variable ?? inferVariable(detected.expression);
      if (!variable) throw new MathInputError("Add one variable to differentiate, for example d/dx x^2.");
      const body = normalizeLatex(detected.expression);
      const derivative = engine.parse(`\\frac{d}{d${variable}}(${body})`).evaluate();
      return formatResult(input, normalizedInput, "differentiate", derivative, variable);
    }

    const hasDifferential = /(?:d[a-zA-Z]\s*$|\\mathrm\s*\{\s*d[a-zA-Z]\s*\}\s*$)/.test(detected.expression);
    const selectedVariable =
      detected.operation === "summation"
        ? detected.variable
        : ["solve", "differentiate", "integrate"].includes(detected.operation)
          ? (variableOverride ?? detected.variable ?? inferVariable(detected.expression))
          : undefined;
    const computationInput =
      detected.operation === "integrate" && !hasDifferential && selectedVariable
        ? normalizeLatex(`${detected.expression} d${selectedVariable}`)
        : normalizedInput;

    if (detected.operation === "solve") {
      const equation = engine.parse(computationInput);
      if (!equation) throw new MathInputError("TeXact couldn't parse this equation.");
      const variables = equation.symbols.filter((symbol) => /^[a-zA-Z]$/.test(symbol));
      const isSystem = equation.toString().startsWith("[") && variables.length > 1;
      const variable = variableOverride ?? detected.variable ?? (variables.length === 1 ? variables[0] : undefined);
      if (!isSystem && !variable)
        throw new MathInputError("TeXact needs one variable to solve for. Try an equation with a single unknown.");
      const solveVariables = isSystem ? variables : [variable as string];
      const rawSolutions = equation.solve(solveVariables);
      if (!rawSolutions)
        throw new MathInputError(`TeXact couldn't solve this equation for ${variable ?? solveVariables.join(", ")}.`);
      if (Array.isArray(rawSolutions) && rawSolutions.length === 0)
        throw new MathInputError("This equation has no solutions the symbolic engine can determine.");
      const solutionRecords: Array<Record<string, Expression>> = isSystem
        ? Array.isArray(rawSolutions)
          ? (rawSolutions as unknown as Array<Record<string, Expression>>)
          : [rawSolutions as Record<string, Expression>]
        : (rawSolutions as unknown as readonly Expression[]).map((solution) => ({ [solveVariables[0]]: solution }));
      const values = solutionRecords.map((record) =>
        Object.entries(record)
          .map(([name, solution]) => `${name} = ${solution.toString()}`)
          .join(", "),
      );
      const latexValues = solutionRecords.map((record) =>
        Object.entries(record)
          .map(([name, solution]) => `${name} &= ${solution.toLatex()}`)
          .join(" \\\\ "),
      );
      const latex = isSystem
        ? `\\begin{aligned}${latexValues.join(" \\\\ \\text{or} \\\\ ")}\\end{aligned}`
        : `${solveVariables[0]} \\in \\left\\{${solutionRecords.map((record) => record[solveVariables[0]]?.toLatex()).join(", ")}\\right\\}`;
      const plain = values.join(isSystem ? "; " : ", ");
      return {
        input,
        normalizedInput,
        operation: "solve",
        exact: plain,
        plain,
        latex,
        variable: solveVariables.join(", "),
        solutions: values,
        timestamp: Date.now(),
      };
    }

    const expression = engine.parse(computationInput);
    if (!expression)
      throw new MathInputError("TeXact couldn't parse this expression. Check the LaTeX syntax and try again.");
    if (!expression.isValid)
      throw new MathInputError("TeXact couldn't parse this expression. Check the LaTeX syntax and try again.");

    let result = expression;
    if (detected.operation === "integrate" || detected.operation === "limit") {
      result = expression.evaluate();
      if (result.toString().includes("Error(")) {
        throw new MathInputError(
          `TeXact couldn't ${detected.operation === "integrate" ? "find a symbolic antiderivative" : "evaluate this limit"} for that expression.`,
        );
      }
      if (detected.operation === "integrate" && !/\\int_/.test(input)) {
        const exact = `${result.toString()} + C`;
        const latex = `${result.toLatex()} + C`;
        return {
          ...formatResult(input, normalizedInput, detected.operation, result, selectedVariable),
          exact,
          plain: exact,
          latex,
        };
      }
    } else if (detected.operation === "summation") {
      // `simplify()` derives closed forms for symbolic bounds. `evaluate()` handles finite bounds.
      result = expression.simplify();
      if (result.symbols.length === 0) result = result.evaluate();
    } else {
      result = expression.simplify();
    }

    if (!result.isValid)
      throw new MathInputError("TeXact couldn't parse this expression. Check the syntax and try again.");
    if (result.toString().includes("Error("))
      throw new MathInputError(
        "TeXact couldn't evaluate this expression. Check for division by zero or unsupported syntax.",
      );
    if (detected.operation === "integrate" && result.toString().includes("int_("))
      throw new MathInputError("TeXact couldn't find a symbolic antiderivative for this expression.");
    if (detected.operation === "summation" && result.toString().startsWith("sum_("))
      throw new MathInputError("TeXact couldn't find a closed form for this sum.");
    if (detected.operation === "limit" && result.toString().startsWith("lim_("))
      throw new MathInputError("TeXact couldn't evaluate this limit.");
    return formatResult(input, normalizedInput, detected.operation, result, selectedVariable);
  } catch (error) {
    if (error instanceof MathInputError) throw error;
    const message = error instanceof Error ? error.message : "Unknown math error";
    throw new MathInputError(`TeXact couldn't calculate this expression: ${message}`);
  }
}
