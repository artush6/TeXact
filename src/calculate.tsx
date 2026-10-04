import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useState } from "react";
import ResultDetail from "./components/ResultDetail";
import { getCommonRules, getReferenceTitle, isAbstractRuleInput, isRuleLookupInput } from "./math/common-rules";
import { MathInputError } from "./math/errors";
import { calculate, getVariables } from "./math/engine";
import type { MathResult } from "./math/types";
import { saveResult } from "./storage/history";

interface LivePreview {
  query: string;
  result?: MathResult;
  error?: string;
  rules?: ReturnType<typeof getCommonRules>;
  referenceTitle?: string;
}

const operationTitles: Record<MathResult["operation"], string> = {
  evaluate: "Evaluate",
  simplify: "Simplify",
  differentiate: "Differentiate",
  integrate: "Integrate",
  solve: "Solve",
  summation: "Summation",
  limit: "Limit",
};

function stripMathDelimiters(query: string): string {
  return query
    .trim()
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .trim();
}

function mathBlock(latex: string): string {
  return `\\[\n${stripMathDelimiters(latex)}\n\\]`;
}

function inlineMath(latex: string, displayStyle = false): string {
  const style = displayStyle ? "\\displaystyle " : "";
  return `\\(${style}${stripMathDelimiters(latex).replace(/\r?\n/g, " ")}\\)`;
}

function previewMarkdown(query: string, preview: LivePreview): string {
  if (!query.trim()) {
    return [
      "# TeXact Calculator",
      "",
      "Type a math expression to see it rendered here. TeXact also identifies common calculus rules as you write.",
      "",
      "Press **⌘↵** to calculate or look up formulas. Try `\\frac{d}{dx}\\frac{u}{v}`, `\\int x^2 dx`, or `\\sum_{k=0}^{n} k^2`.",
    ].join("\n");
  }

  if (preview.referenceTitle) {
    const rules = preview.rules ?? [];
    const topicLookup = isRuleLookupInput(query);
    const sections = rules.map((rule) => `#### ${rule.title}\n\n${mathBlock(rule.latex)}`).join("\n\n");
    if (topicLookup) return `# ${preview.referenceTitle}\n\n${sections}`;

    return [
      `|  |  |  |`,
      "|:--|:--:|--:|",
      `| ${inlineMath(query)} | → | ${inlineMath(rules[0]?.latex ?? "")} |`,
      "",
      sections,
    ].join("\n");
  }

  if (preview.result) {
    const decimal = preview.result.decimal ? `\n\n**Approx.** ${preview.result.decimal}` : "";
    const useCard = !/[|\r\n]/.test(query) && !/[|\r\n]/.test(preview.result.latex);
    const comparison = useCard
      ? ["|  |  |  |", "|:--|:--:|--:|", `| ${inlineMath(query)} | → | ${inlineMath(preview.result.latex)} |`].join(
          "\n",
        )
      : `${mathBlock(query)}\n\n→\n\n${mathBlock(preview.result.latex)}`;
    const rules = (preview.rules ?? []).map((rule) => `#### ${rule.title}\n\n${mathBlock(rule.latex)}`).join("\n\n");
    return [comparison, decimal, rules ? "\n---\n\n" + rules : ""].join("\n");
  }

  const rules = (preview.rules ?? []).map((rule) => `#### ${rule.title}\n\n${mathBlock(rule.latex)}`).join("\n\n");
  const isShortExpression = !/[|\r\n]/.test(query) && query.length <= 120;
  const expressionPreview = isShortExpression ? `# ${inlineMath(query, true)}` : mathBlock(query);
  return [expressionPreview, rules ? `\n---\n\n${rules}` : ""].join("\n");
}

export default function CalculateCommand() {
  const [searchText, setSearchText] = useState("");
  const [variableChoice, setVariableChoice] = useState("auto");
  const [preview, setPreview] = useState<LivePreview>({ query: "" });
  const variables = getVariables(searchText);
  const isSystemInput = /\\begin\{cases\}/.test(searchText) || /[;\n].*=/.test(searchText);
  const supportsVariableChoice =
    variables.length > 0 &&
    !/\\sum(?=\s|_)/.test(searchText) &&
    !isSystemInput &&
    (searchText.includes("=") || /\\int|\\frac\s*\{\s*d|d\s*\/\s*d|\b(?:diff|differentiate)\b/.test(searchText));
  const selectedVariable = variables.includes(variableChoice) ? variableChoice : "auto";
  const currentPreview = preview.query === searchText ? preview : { query: searchText };
  const currentResult = currentPreview.result;
  const detectedRules = currentPreview.rules ?? getCommonRules(searchText);

  function calculateCurrentExpression() {
    if (!searchText.trim()) return;

    const referenceTitle = getReferenceTitle(searchText);
    const rules = getCommonRules(searchText);
    if (referenceTitle) {
      setPreview({ query: searchText, rules, referenceTitle });
      return;
    }
    if (isAbstractRuleInput(searchText) && rules.length > 0) {
      setPreview({ query: searchText, rules, referenceTitle: rules[0].title });
      return;
    }

    try {
      const result = calculate(searchText, selectedVariable === "auto" ? undefined : selectedVariable);
      setPreview({ query: searchText, result, rules });
      void saveResult(result).catch(() => undefined);
    } catch (error) {
      setPreview({
        query: searchText,
        rules,
        error: error instanceof MathInputError ? error.message : "TeXact couldn't parse this expression yet.",
      });
    }
  }

  const actions = (
    <ActionPanel>
      {currentResult ? (
        <Action.Push title="Open Full Result" icon={Icon.ArrowRight} target={<ResultDetail result={currentResult} />} />
      ) : (
        <Action.CopyToClipboard title="Copy Input" content={searchText} />
      )}
      <Action
        title={
          currentResult
            ? "Calculate Again"
            : getReferenceTitle(searchText) || (isAbstractRuleInput(searchText) ? "Show Common Rule" : "Calculate")
        }
        icon={Icon.Calculator}
        onAction={calculateCurrentExpression}
      />
      {currentResult ? (
        <>
          <Action.CopyToClipboard
            title="Copy Result"
            content={currentResult.plain}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy LaTeX"
            content={currentResult.latex}
            shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
          />
          <Action.CopyToClipboard title="Copy Input" content={currentResult.input} />
        </>
      ) : null}
    </ActionPanel>
  );

  return (
    <List
      navigationTitle="Calculate with TeXact"
      searchBarPlaceholder="Type an expression, then press ⌘↵ to calculate"
      searchText={searchText}
      onSearchTextChange={(value) => {
        setSearchText(value);
        setPreview({ query: value });
      }}
      filtering={false}
      isShowingDetail
      searchBarAccessory={
        supportsVariableChoice ? (
          <List.Dropdown
            tooltip="Select a variable"
            value={selectedVariable}
            onChange={(value) => {
              setVariableChoice(value);
              setPreview({ query: searchText });
            }}
            storeValue={false}
          >
            <List.Dropdown.Item title="Auto detect" value="auto" />
            {variables.length ? (
              <List.Dropdown.Section title="Variables in expression">
                {variables.map((variable) => (
                  <List.Dropdown.Item key={variable} title={`Variable ${variable}`} value={variable} />
                ))}
              </List.Dropdown.Section>
            ) : null}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.Item
        id="live-preview"
        icon={currentResult ? Icon.CheckCircle : Icon.Calculator}
        title="TeXact"
        subtitle={
          currentResult
            ? operationTitles[currentResult.operation]
            : (currentPreview.referenceTitle ?? detectedRules[0]?.title ?? currentPreview.error)
        }
        detail={
          <List.Item.Detail
            markdown={previewMarkdown(searchText, { ...currentPreview, rules: detectedRules })}
            metadata={
              currentResult ? (
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Operation" text={operationTitles[currentResult.operation]} />
                  {currentResult.variable ? (
                    <List.Item.Detail.Metadata.Label title="Variable" text={currentResult.variable} />
                  ) : null}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Input" text={currentResult.input} />
                </List.Item.Detail.Metadata>
              ) : undefined
            }
          />
        }
        actions={actions}
      />
    </List>
  );
}
