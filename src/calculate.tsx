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
      "Type a math expression to see a live preview.",
      "Press **⌘↵** to calculate or look up formulas. Try `\\frac{d}{dx}\\frac{u}{v}`, `\\int x^2 dx`, or `\\sum_{k=0}^{n} k^2`.",
    ].join("\n");
  }

  if (preview.referenceTitle) {
    const rules = preview.rules ?? [];
    const topicLookup = isRuleLookupInput(query);
    const sections = rules.map((rule) => `#### ${rule.title}\n\n${mathBlock(rule.latex)}`).join("\n\n");
    if (topicLookup) return `# ${preview.referenceTitle}\n\n${sections}`;
    return `# ${inlineMath(rules[0]?.latex ?? "", true)}`;
  }

  if (preview.result) {
    const answer = preview.result.latex;
    const isShortAnswer = !/[|\r\n]/.test(answer) && answer.length <= 160;
    return isShortAnswer ? `# ${inlineMath(answer, true)}` : mathBlock(answer);
  }

  const rules = (preview.rules ?? []).map((rule) => `#### ${rule.title}\n\n${mathBlock(rule.latex)}`).join("\n\n");
  const isShortExpression = !/[|\r\n]/.test(query) && query.length <= 120;
  const expressionPreview = isShortExpression ? `# ${inlineMath(query, true)}` : mathBlock(query);
  const hint = preview.error ? `**${preview.error}**` : "Press **⌘↵** to calculate.";
  return [expressionPreview, rules ? `\n---\n\n${rules}` : "", hint].join("\n");
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
          currentResult ? undefined : (currentPreview.referenceTitle ?? detectedRules[0]?.title ?? currentPreview.error)
        }
        detail={
          <List.Item.Detail markdown={previewMarkdown(searchText, { ...currentPreview, rules: detectedRules })} />
        }
        actions={actions}
      />
    </List>
  );
}
