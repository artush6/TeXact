export interface MathExample {
  input: string;
  description: string;
}

export const examples: MathExample[] = [
  { input: "\\frac{2}{3} + \\frac{5}{7}", description: "Exact fractions" },
  { input: "\\frac{d}{dx} x^3", description: "Differentiate a polynomial" },
  { input: "\\int x^2 dx", description: "Find an antiderivative" },
  { input: "x^2 - 5x + 6 = 0", description: "Solve a quadratic" },
  { input: "\\sum_{k=1}^{10} k", description: "Evaluate a finite sum" },
  { input: "\\sum_{k=1}^{n} k", description: "Find a closed form" },
  { input: "\\sqrt{2}", description: "Exact form and decimal approximation" },
  { input: "\\begin{cases}x+y=5\\\\x-y=1\\end{cases}", description: "Solve a linear system" },
];
