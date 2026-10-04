import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, Toast, showToast, useNavigation } from "@raycast/api";
import type { MathResult } from "../math/types";

const operationNames: Record<MathResult["operation"], string> = {
  evaluate: "Evaluate",
  simplify: "Simplify",
  differentiate: "Differentiate",
  integrate: "Integrate",
  solve: "Solve",
  summation: "Summation",
  limit: "Limit",
};

function renderLatexBlock(latex: string): string {
  const safeLatex = latex.replace(/\r?\n/g, " ").trim();
  return `# Result\n\n\\[\n${safeLatex}\n\\]`;
}

async function copy(text: string, message: string): Promise<void> {
  await Clipboard.copy(text);
  await showToast({ style: Toast.Style.Success, title: message });
}

export default function ResultDetail({ result }: { result: MathResult }) {
  const { pop } = useNavigation();
  const decimal = result.decimal ? `\n\n**Approx.** ${result.decimal}` : "";
  return (
    <Detail
      navigationTitle="TeXact Result"
      markdown={`${renderLatexBlock(result.latex)}${decimal}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Operation" text={operationNames[result.operation]} />
          {result.variable ? <Detail.Metadata.Label title="Variable" text={result.variable} /> : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Input" text={result.input} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy Result"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => copy(result.plain, "Result copied")}
          />
          <Action
            title="Copy LaTeX"
            icon={Icon.Code}
            shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
            onAction={() => copy(result.latex, "LaTeX copied")}
          />
          <Action title="Copy Input" icon={Icon.CopyClipboard} onAction={() => copy(result.input, "Input copied")} />
          <Action title="Calculate Another" icon={Icon.Plus} shortcut={Keyboard.Shortcut.Common.New} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
