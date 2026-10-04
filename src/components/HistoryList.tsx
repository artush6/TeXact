import { Action, ActionPanel, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import ResultDetail from "./ResultDetail";
import { MathInputError } from "../math/errors";
import { calculate } from "../math/engine";
import type { HistoryEntry, MathResult } from "../math/types";
import { deleteHistoryEntry, readHistory, saveResult, clearHistory } from "../storage/history";

export default function HistoryList() {
  const { push } = useNavigation();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void readHistory()
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }, []);

  async function recalculate(input: string): Promise<void> {
    try {
      const result: MathResult = calculate(input);
      setEntries(await saveResult(result));
      push(<ResultDetail result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: error instanceof MathInputError ? "Check your expression" : "Calculation failed",
        message: error instanceof Error ? error.message : "TeXact could not calculate this expression.",
      });
    }
  }

  async function remove(id: string): Promise<void> {
    setEntries(await deleteHistoryEntry(id));
    await showToast({ style: Toast.Style.Success, title: "Removed from history" });
  }

  async function clear(): Promise<void> {
    if (
      !(await confirmAlert({
        title: "Clear calculation history?",
        message: "This removes all saved calculations.",
        primaryAction: { title: "Clear History" },
      }))
    )
      return;
    await clearHistory();
    setEntries([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List isLoading={isLoading} navigationTitle="TeXact History" searchBarPlaceholder="Search calculations">
      {entries.map((entry) => (
        <List.Item
          key={entry.id}
          icon={Icon.Calculator}
          title={entry.input}
          subtitle={entry.plain}
          accessories={[{ tag: entry.operation }, { date: new Date(entry.timestamp) }]}
          actions={
            <ActionPanel>
              <Action.Push title="Open Result" icon={Icon.Eye} target={<ResultDetail result={entry} />} />
              <Action title="Recalculate" icon={Icon.ArrowClockwise} onAction={() => recalculate(entry.input)} />
              <Action title="Delete from History" icon={Icon.Trash} onAction={() => remove(entry.id)} />
              <Action title="Clear History" icon={Icon.Trash} onAction={clear} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && entries.length === 0 ? (
        <List.EmptyView
          title="No calculations yet"
          description="Your recent TeXact results will show up here."
          icon={Icon.Clock}
        />
      ) : null}
    </List>
  );
}
