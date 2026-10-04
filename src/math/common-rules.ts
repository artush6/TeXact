export interface CommonRule {
  title: string;
  latex: string;
}

type RuleTopic = "sum" | "derivative" | "integral" | "limit";

const ruleCatalog: Record<RuleTopic, CommonRule[]> = {
  sum: [
    { title: "Sum of constants", latex: "\\sum_{k=1}^{n} 1 = n" },
    { title: "Sum of integers", latex: "\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}" },
    { title: "Sum of squares", latex: "\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}" },
    { title: "Sum of cubes", latex: "\\sum_{k=1}^{n} k^3 = \\left(\\frac{n(n+1)}{2}\\right)^2" },
  ],
  derivative: [
    { title: "Power rule", latex: "\\frac{d}{dx}x^n = nx^{n-1}" },
    { title: "Product rule", latex: "(uv)' = u'v + uv'" },
    { title: "Quotient rule", latex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v-uv'}{v^2}" },
    { title: "Chain rule", latex: "(f(g(x)))' = f'(g(x))g'(x)" },
  ],
  integral: [
    { title: "Power rule", latex: "\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C, \\quad n \\ne -1" },
    { title: "Reciprocal rule", latex: "\\int \\frac{1}{x}\\,dx = \\ln|x| + C" },
    { title: "Exponential rule", latex: "\\int e^x\\,dx = e^x + C" },
    { title: "Sine rule", latex: "\\int \\sin(x)\\,dx = -\\cos(x) + C" },
  ],
  limit: [
    { title: "Sine limit", latex: "\\lim_{x\\to 0}\\frac{\\sin(x)}{x}=1" },
    { title: "Cosine limit", latex: "\\lim_{x\\to 0}\\frac{1-\\cos(x)}{x^2}=\\frac{1}{2}" },
    { title: "Exponential limit", latex: "\\lim_{x\\to\\infty}\\left(1+\\frac{1}{x}\\right)^x=e" },
  ],
};

function stripDelimiters(input: string): string {
  return input
    .trim()
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .trim();
}

function getRuleTopic(input: string): RuleTopic | undefined {
  const source = stripDelimiters(input)
    .toLowerCase()
    .replace(/[?!.,]+$/, "")
    .trim();
  if (/^(?:show\s+)?(?:common\s+)?(?:sum|sums|summation)(?:\s+rules?|\s+formulas?)?$/.test(source)) return "sum";
  if (
    /^(?:show\s+)?(?:common\s+)?(?:derivative|derivatives|derivation|differentiate|differentiation|diff)(?:\s+rules?|\s+formulas?)?$/.test(
      source,
    )
  )
    return "derivative";
  if (
    /^(?:show\s+)?(?:common\s+)?(?:integral|integrals|integration|primitive|primitives|premitive|premitives|antiderivative|antiderivatives)(?:\s+rules?|\s+formulas?)?$/.test(
      source,
    )
  )
    return "integral";
  if (/^(?:show\s+)?(?:common\s+)?(?:limit|limits)(?:\s+rules?|\s+formulas?)?$/.test(source)) return "limit";
  return undefined;
}

export function isRuleLookupInput(input: string): boolean {
  return getRuleTopic(input) !== undefined;
}

function derivativeRule(source: string): CommonRule | undefined {
  const derivative =
    /(?:\\frac\s*\{\s*d\s*\}\s*\{\s*d[a-zA-Z]\s*\}|\bd\s*\/\s*d[a-zA-Z]|\b(?:diff|differentiate|derivative|derivation)\b|'\s*$)/i.test(
      source,
    );
  if (!derivative) return undefined;

  const expressionAfterDerivative = source
    .replace(/^\\frac\s*\{\s*d\s*\}\s*\{\s*d[a-zA-Z]\s*\}/, "")
    .replace(/^d\s*\/\s*d[a-zA-Z]/, "");
  if (
    /\\frac\s*\{\s*(?:u|f\s*\(?x?\)?)\s*\}\s*\{\s*(?:v|g\s*\(?x?\)?)\s*\}|\b(?:u\s*\/\s*v|f\s*\/\s*g)\b/i.test(
      source,
    ) ||
    /\\frac/.test(expressionAfterDerivative)
  ) {
    return ruleCatalog.derivative[2];
  }
  if (/\buv\b|(?:u|f\s*\(?x?\)?)\s*(?:\\cdot|\*|\s+)\s*(?:v|g\s*\(?x?\)?)/i.test(source)) {
    return ruleCatalog.derivative[1];
  }
  if (/(?:sin|\\sin|cos|\\cos|ln|\\ln|exp|e\^)[^,;]*\([^)]*\([^)]*\)/i.test(source)) {
    return ruleCatalog.derivative[3];
  }
  if (/\\(?:sin|cos|tan|ln|log|exp)\s*\([^)]*(?:\^|[+*/-])[^)]*\)/i.test(source)) {
    return ruleCatalog.derivative[3];
  }
  if (/\([^()]*[+*/-][^()]*\)\s*\^/.test(source)) return ruleCatalog.derivative[3];
  if (/\b[a-zA-Z]\s*\^\s*\{?\s*(?:n|\d+)\s*\}?/.test(source)) return ruleCatalog.derivative[0];
  if (/\\(?:sin|cos|tan|ln|log|exp)\b/.test(source)) {
    const name = /\\(sin|cos|tan|ln|log|exp)\b/.exec(source)?.[1];
    const formulas: Record<string, CommonRule> = {
      sin: { title: "Sine derivative", latex: "\\frac{d}{dx}\\sin(x)=\\cos(x)" },
      cos: { title: "Cosine derivative", latex: "\\frac{d}{dx}\\cos(x)=-\\sin(x)" },
      tan: { title: "Tangent derivative", latex: "\\frac{d}{dx}\\tan(x)=\\sec^2(x)" },
      ln: { title: "Logarithm derivative", latex: "\\frac{d}{dx}\\ln(x)=\\frac{1}{x}" },
      log: { title: "Logarithm derivative", latex: "\\frac{d}{dx}\\log(x)=\\frac{1}{x}" },
      exp: { title: "Exponential derivative", latex: "\\frac{d}{dx}e^x=e^x" },
    };
    if (name) return formulas[name];
  }
  return undefined;
}

function integralRule(source: string): CommonRule | undefined {
  if (!/\\int|\b(?:integral|integrate|primitive|premitive|antiderivative)\b/i.test(source)) return undefined;
  if (/\\frac\s*\{\s*1\s*\}\s*\{\s*[a-zA-Z]\s*\}|\b1\s*\/\s*[a-zA-Z]\b|\^\s*\{?\s*-1\s*\}?/.test(source))
    return ruleCatalog.integral[1];
  if (/\\sin\b|\bsin\s*\(/.test(source)) return ruleCatalog.integral[3];
  if (/\\cos\b|\bcos\s*\(/.test(source)) {
    return { title: "Cosine rule", latex: "\\int \\cos(x)\\,dx = \\sin(x) + C" };
  }
  if (/\\exp\b|e\s*\^\s*\{?\s*[a-zA-Z]\s*\}?/.test(source)) return ruleCatalog.integral[2];
  if (/\^\s*\{?\s*(?:n|\d+)\s*\}?/.test(source)) return ruleCatalog.integral[0];
  return undefined;
}

function summationRule(source: string): CommonRule | undefined {
  if (!/\\sum|\bsummation\b|\bsum\s*\(/i.test(source)) return undefined;
  const powerMatch =
    /\\sum_\{\s*([a-zA-Z])\s*=\s*(-?\d+)\s*\}\s*\^\{\s*([^{}]+)\s*\}\s*([a-zA-Z])(?:\s*\^\s*\{?\s*([1-3])\s*\}?)?/.exec(
      source,
    );
  if (!powerMatch) return undefined;
  const [, index, lowerText, upper, term, power] = powerMatch;
  if (index !== term) return undefined;
  const lower = Number(lowerText);
  if (lower < 0) return undefined;
  const upperFormula = (powerValue: string) => {
    if (powerValue === "2") return `\\frac{${upper}(${upper}+1)(2${upper}+1)}{6}`;
    if (powerValue === "3") return `\\left(\\frac{${upper}(${upper}+1)}{2}\\right)^2`;
    return `\\frac{${upper}(${upper}+1)}{2}`;
  };
  const lowerFormula = (powerValue: string) => {
    if (lower <= 1) return "0";
    const prior = String(lower - 1);
    if (powerValue === "2") return `\\frac{${prior}(${prior}+1)(2${prior}+1)}{6}`;
    if (powerValue === "3") return `\\left(\\frac{${prior}(${prior}+1)}{2}\\right)^2`;
    return `\\frac{${prior}(${prior}+1)}{2}`;
  };
  if (power === "2")
    return {
      title: "Sum of squares",
      latex: `\\sum_{${index}=${lower}}^{${upper}} ${index}^2 = ${upperFormula("2")}${lower > 1 ? `-${lowerFormula("2")}` : ""}`,
    };
  if (power === "3")
    return {
      title: "Sum of cubes",
      latex: `\\sum_{${index}=${lower}}^{${upper}} ${index}^3 = ${upperFormula("3")}${lower > 1 ? `-${lowerFormula("3")}` : ""}`,
    };
  if (power === "1" || !power)
    return {
      title: "Sum of integers",
      latex: `\\sum_{${index}=${lower}}^{${upper}} ${index} = ${upperFormula("1")}${lower > 1 ? `-${lowerFormula("1")}` : ""}`,
    };
  return undefined;
}

function limitRule(source: string): CommonRule | undefined {
  if (!/\\lim|\blimit\b/i.test(source)) return undefined;
  if (/\\sin\s*\(?x\)?[^/]*\/\s*x|\\frac\s*\{\\sin\s*\(?x\)?\}\s*\{x\}/i.test(source)) return ruleCatalog.limit[0];
  if (/1\s*-\s*\\cos|1-\\cos/i.test(source)) return ruleCatalog.limit[1];
  if (/1\s*\+\s*\\frac\s*\{1\}\s*\{x\}|\(\s*1\s*\+\s*1\s*\/\s*x\s*\)\s*\^\s*x/i.test(source))
    return ruleCatalog.limit[2];
  return undefined;
}

export function getCommonRules(input: string): CommonRule[] {
  const topic = getRuleTopic(input);
  if (topic) return ruleCatalog[topic];

  const source = stripDelimiters(input);
  const rule = derivativeRule(source) ?? integralRule(source) ?? summationRule(source) ?? limitRule(source);
  return rule ? [rule] : [];
}

export function getReferenceTitle(input: string): string | undefined {
  const topic = getRuleTopic(input);
  if (!topic) return undefined;
  const titles: Record<RuleTopic, string> = {
    sum: "Summation Formulas",
    derivative: "Derivative Rules",
    integral: "Integral and Primitive Rules",
    limit: "Limit Formulas",
  };
  return titles[topic];
}

export function isAbstractRuleInput(input: string): boolean {
  const source = stripDelimiters(input);
  const hasDerivativeMarker =
    /(?:\\frac\s*\{\s*d\s*\}|\bd\s*\/\s*d|'\s*$|\b(?:diff|differentiate|derivative|derivation)\b)/i.test(source);
  const hasPlaceholder = /(?:\\frac\s*\{\s*u\s*\}\s*\{\s*v\s*\}|\bu\s*\/\s*v\b)/i.test(source);
  return hasDerivativeMarker && hasPlaceholder;
}
