const QUEUE_KEY = "cooking_rating_queue_v1";

export type PendingRating = {
  recipeId: string;
  rating: number;
  at: number;
};

export function loadPendingRatings(): PendingRating[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingRating[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingRating(entry: PendingRating): void {
  const list = loadPendingRatings().filter((x) => x.recipeId !== entry.recipeId);
  list.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
}

export function dequeuePendingRating(recipeId: string): void {
  const list = loadPendingRatings().filter((x) => x.recipeId !== recipeId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
}
