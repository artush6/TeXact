import { LocalStorage } from "@raycast/api";
import type { HistoryEntry, MathResult } from "../math/types";

const STORAGE_KEY = "texact.history.v1";
const HISTORY_LIMIT = 100;

export async function readHistory(): Promise<HistoryEntry[]> {
  const serialized = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!serialized) return [];
  try {
    const entries: unknown = JSON.parse(serialized);
    return Array.isArray(entries) ? (entries as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveResult(result: MathResult): Promise<HistoryEntry[]> {
  const entries = await readHistory();
  const entry: HistoryEntry = { ...result, id: `${result.timestamp}-${Math.random().toString(36).slice(2, 8)}` };
  const updated = [entry, ...entries].slice(0, HISTORY_LIMIT);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteHistoryEntry(id: string): Promise<HistoryEntry[]> {
  const updated = (await readHistory()).filter((entry) => entry.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
