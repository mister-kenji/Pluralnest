export type MoodType = "scale" | "emotion";

export interface MoodDef {
  value: number;
  emoji: string;
  label: string;
  color: string;
  type: MoodType;
}

/** 1-5 scale moods — backward-compatible, used for averaging */
export const SCALE_MOODS: MoodDef[] = [
  { value: 1, emoji: "😔", label: "Rough",   color: "#ef4444", type: "scale" },
  { value: 2, emoji: "😕", label: "Low",     color: "#f97316", type: "scale" },
  { value: 3, emoji: "😐", label: "Okay",    color: "#eab308", type: "scale" },
  { value: 4, emoji: "🙂", label: "Good",    color: "#84cc16", type: "scale" },
  { value: 5, emoji: "😊", label: "Great",   color: "#22c55e", type: "scale" },
];

/** Extra named emotions — values 6+ */
export const EXTRA_MOODS: MoodDef[] = [
  // Positive
  { value: 6,  emoji: "😄", label: "Happy",       color: "#22c55e", type: "emotion" },
  { value: 7,  emoji: "🤩", label: "Excited",     color: "#f59e0b", type: "emotion" },
  { value: 8,  emoji: "😌", label: "Calm",        color: "#60a5fa", type: "emotion" },
  { value: 9,  emoji: "🤗", label: "Content",     color: "#84cc16", type: "emotion" },
  { value: 10, emoji: "😜", label: "Playful",     color: "#f59e0b", type: "emotion" },
  { value: 11, emoji: "🌱", label: "Grounded",    color: "#14b8a6", type: "emotion" },
  { value: 12, emoji: "🌟", label: "Hopeful",     color: "#eab308", type: "emotion" },
  { value: 13, emoji: "🫂", label: "Safe",        color: "#06b6d4", type: "emotion" },
  { value: 14, emoji: "🙏", label: "Grateful",    color: "#a78bfa", type: "emotion" },
  // Neutral / heavy
  { value: 15, emoji: "😴", label: "Tired",       color: "#94a3b8", type: "emotion" },
  { value: 16, emoji: "😑", label: "Numb",        color: "#6b7280", type: "emotion" },
  { value: 17, emoji: "🌀", label: "Dissociated", color: "#7dd3fc", type: "emotion" },
  { value: 18, emoji: "😵‍💫", label: "Disoriented", color: "#c084fc", type: "emotion" },
  { value: 19, emoji: "🤔", label: "Confused",    color: "#fb923c", type: "emotion" },
  // Negative
  { value: 20, emoji: "😰", label: "Anxious",     color: "#f97316", type: "emotion" },
  { value: 21, emoji: "😵", label: "Overwhelmed", color: "#dc2626", type: "emotion" },
  { value: 22, emoji: "😤", label: "Stressed",    color: "#ef4444", type: "emotion" },
  { value: 23, emoji: "😠", label: "Angry",       color: "#ef4444", type: "emotion" },
  { value: 24, emoji: "😣", label: "Frustrated",  color: "#f97316", type: "emotion" },
  { value: 25, emoji: "😨", label: "Scared",      color: "#9333ea", type: "emotion" },
  { value: 26, emoji: "😢", label: "Sad",         color: "#60a5fa", type: "emotion" },
  { value: 27, emoji: "😳", label: "Embarrassed", color: "#f472b6", type: "emotion" },
  { value: 28, emoji: "😟", label: "Guilty",      color: "#9ca3af", type: "emotion" },
];

/** All moods — use for lookup by value */
export const MOODS: MoodDef[] = [...SCALE_MOODS, ...EXTRA_MOODS];

export type MoodValue = number;

export function getMood(value?: number | null): MoodDef | null {
  if (value == null) return null;
  return MOODS.find((m) => m.value === value) ?? null;
}
