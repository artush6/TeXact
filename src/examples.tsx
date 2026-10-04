import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { MathInputError } from "./math/errors";
import { calculate } from "./math/engine";
import ResultDetail from "./components/ResultDetail";
import { saveResult } from "./storage/history";
import { examples } from "./utils/examples";

export default function ExamplesCommand() {
  const { push } = useNavigation();

  async function calculateExample(input: string): Promise<void> {
    try {
      const result = calculate(input);
      await saveResult(result);
      push(<ResultDetail result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: error instanceof MathInputError ? "Check the example" : "Calculation failed",
        message: error instanceof Error ? error.message : "TeXact could not calculate this example.",
      });
    }
  }

  return (
    <List navigationTitle="TeXact Examples" searchBarPlaceholder="Find an example">
      {examples.map((example) => (
        <List.Item
          key={example.input}
          icon={Icon.Calculator}
          title={example.input}
          subtitle={example.description}
          actions={
            <ActionPanel>
              <Action
                title="Calculate Example"
                icon={Icon.Calculator}
                onAction={() => calculateExample(example.input)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
