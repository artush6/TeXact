import assert from "node:assert/strict";
import test from "node:test";
import { calculate, getVariables } from "./engine";
import { MathInputError } from "./errors";
import { normalizeLatex } from "./latex-normalizer";

test("normalizes common LaTeX delimiters, fractions, and roots", () => {
  assert.equal(normalizeLatex("  \\[\\frac{1}{2} + \\sqrt{16}\\]  "), "((1)/(2)) + \\sqrt{16}");
  assert.equal(normalizeLatex("$$x^{10}$$"), "x^{10}");
});

test("evaluates exact arithmetic and common LaTeX", () => {
  assert.equal(calculate("2 + 2").plain, "4");
  assert.equal(calculate("1/3").plain, "1/3");
  assert.equal(calculate("\\frac{1}{2} + \\frac{1}{3}").plain, "5/6");
  assert.equal(calculate("\\frac{1}{2}").plain, "1/2");
  assert.equal(calculate("\\frac{x+1}{2}").plain, "1/2 * x + 1/2");
  assert.equal(calculate("\\sqrt{16}").plain, "4");
  assert.equal(calculate("sqrt(16)").plain, "4");
  assert.equal(calculate("x^{2}").plain, "x^2");
  assert.equal(calculate("2x").plain, "2x");
  assert.equal(calculate("2\\pi").plain, "2pi");
  assert.equal(calculate("sin(pi/2)").plain, "1");
  assert.equal(calculate("x+x").plain, "2x");
  assert.equal(calculate("\\sin(\\pi/2)").plain, "1");
  assert.equal(calculate("\\log_2(8)").plain, "3");
  assert.equal(calculate("\\left|-3\\right|").plain, "3");
  assert.equal(calculate("\\dfrac{1}{2}+\\tfrac{1}{3}").plain, "5/6");
  assert.equal(calculate("\\arcsin(1)").decimal, "1.570796327");
  assert.equal(calculate("\\frac{2}{3}+\\frac{5}{7}").plain, "29/21");
});

test("calculates derivatives and integrals", () => {
  assert.equal(calculate("\\frac{d}{dx}x^3").plain, "3x^2");
  assert.equal(calculate("diff x*y", "y").plain, "x");
  assert.equal(calculate("\\int x^2 dx").plain, "1/3 * x^3 + C");
  assert.equal(calculate("\\int x^2", "x").plain, "1/3 * x^3 + C");
  assert.equal(calculate("\\int_{0}^{1} x^2 dx").plain, "1/3");
  assert.equal(calculate("\\lim_{x \\to 0} \\frac{\\sin x}{x}").plain, "1");
});

test("solves equations and evaluates both finite and symbolic sums", () => {
  assert.equal(calculate("x^2 - 5x + 6 = 0").plain, "x = 3, x = 2");
  assert.equal(calculate("\\sum_{k=1}^{10} k").plain, "55");
  assert.equal(calculate("\\sum_{k=1}^{n} k").plain, "1/2 * (n^2 + n)");
  assert.equal(calculate("\\sum_{k=1}^{n} k^2").latex, "\\frac{n^3}{3}+\\frac{n^2}{2}+\\frac{n}{6}");
  assert.throws(() => calculate("\\sum_{k=1}^{n} \\sin(k)"), MathInputError);
});

test("lets a selected variable resolve a multivariable equation", () => {
  assert.match(calculate("x + y = 5", "x").plain, /^x = /);
  assert.deepEqual(getVariables("x + y = 5"), ["x", "y"]);
  assert.deepEqual(getVariables("\\frac{d}{dx}x*y"), ["x", "y"]);
});

test("solves linear and polynomial systems written in cases notation", () => {
  const linear = calculate("\\begin{cases}x+y=5\\\\x-y=1\\end{cases}");
  assert.equal(linear.operation, "solve");
  assert.match(linear.plain, /x = 3, y = 2/);

  const polynomial = calculate("\\begin{cases}xy=6\\\\x+y=5\\end{cases}");
  assert.match(polynomial.plain, /x = 3, y = 2/);
  assert.match(polynomial.plain, /x = 2, y = 3/);

  const separated = calculate("x+y=5; x-y=1");
  assert.equal(separated.plain, "x = 3, y = 2");
  assert.deepEqual(getVariables("x+y=5; x-y=1"), ["x", "y"]);
});

test("keeps exact radicals and supplies a compact approximation", () => {
  const result = calculate("\\sqrt{2}");
  assert.equal(result.latex, "\\sqrt{2}");
  assert.equal(result.decimal, "1.414213562");
});

test("rejects empty and unsupported malformed input with a typed error", () => {
  assert.throws(() => calculate("  "), MathInputError);
  assert.throws(() => calculate("\\frac{1}"), MathInputError);
});
