export const MOODS = [
  { value: 1, emoji: "😔", label: "Rough", color: "#ef4444" },
  { value: 2, emoji: "😕", label: "Low",   color: "#f97316" },
  { value: 3, emoji: "😐", label: "Okay",  color: "#eab308" },
  { value: 4, emoji: "🙂", label: "Good",  color: "#84cc16" },
  { value: 5, emoji: "😊", label: "Great", color: "#22c55e" },
] as const;

export type MoodValue = 1 | 2 | 3 | 4 | 5;

export function getMood(value?: number | null) {
  if (value == null) return null;
  return MOODS.find((m) => m.value === value) ?? null;
}
