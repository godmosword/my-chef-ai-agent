export type PersonalizationBlock = {
  hard_constraints: string[];
  soft_preferences: string[];
  household_notes: string[];
  recent_dishes_to_avoid: string[];
  skill_and_time: string | null;
  confidence: number;
  token_estimate: number;
  is_empty: boolean;
};

export function emptyPersonalizationBlock(): PersonalizationBlock {
  return {
    hard_constraints: [],
    soft_preferences: [],
    household_notes: [],
    recent_dishes_to_avoid: [],
    skill_and_time: null,
    confidence: 0,
    token_estimate: 0,
    is_empty: true,
  };
}
