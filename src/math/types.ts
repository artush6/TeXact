export type Operation = "evaluate" | "simplify" | "differentiate" | "integrate" | "solve" | "summation" | "limit";

export interface MathResult {
  input: string;
  normalizedInput: string;
  operation: Operation;
  exact: string;
  plain: string;
  latex: string;
  decimal?: string;
  variable?: string;
  solutions?: string[];
  timestamp: number;
}

export interface HistoryEntry extends MathResult {
  id: string;
}
