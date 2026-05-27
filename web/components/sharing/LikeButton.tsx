"use client";

import { useCallback, useState } from "react";
import { Heart } from "lucide-react";
import { likeSharedRecipe, unlikeSharedRecipe } from "@/application/api/sharing";
import { cn } from "@/lib/utils/cn";

const LIKED_KEY = (token: string) => `chef_liked_${token}`;

function readLiked(token: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LIKED_KEY(token)) === "1";
}

function writeLiked(token: string, liked: boolean): void {
  if (typeof window === "undefined") return;
  if (liked) localStorage.setItem(LIKED_KEY(token), "1");
  else localStorage.removeItem(LIKED_KEY(token));
}

export function LikeButton({
  token,
  initialCount,
}: {
  token: string;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(() => readLiked(token));
  const [count, setCount] = useState(initialCount);

  const toggle = useCallback(async () => {
    const next = !liked;
    setLiked(next);
    writeLiked(token, next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const data = next
        ? await likeSharedRecipe(token)
        : await unlikeSharedRecipe(token);
      setCount(data.like_count);
      setLiked(data.liked);
      writeLiked(token, data.liked);
    } catch {
      setLiked(!next);
      writeLiked(token, !next);
      setCount((c) => c - (next ? 1 : -1));
    }
  }, [liked, token]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface-default px-4 py-2 text-text-ink transition-colors hover:bg-surface-muted"
    >
      <Heart
        className={cn("size-5", liked && "fill-danger text-danger")}
        aria-hidden
      />
      <span>{count} 人覺得不錯</span>
    </button>
  );
}
