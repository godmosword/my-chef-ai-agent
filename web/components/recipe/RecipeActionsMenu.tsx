"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Home,
  MoreHorizontal,
  Share2,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Sheet } from "@/components/primitives/Sheet";
import { IconButton } from "@/components/primitives/IconButton";
import { useToast } from "@/components/providers/ToastProvider";
import { addIngredientsToShoppingDraft } from "@/lib/shopping/add-from-recipe";
import { formatIngredient } from "@/lib/recipe-steps";
import type { RecipePayload } from "@chef/shared-types";
import { cn } from "@/lib/utils/cn";

type ActionId = "remake" | "shopping" | "copy" | "share" | "home";

const ACTIONS: Array<{
  id: ActionId;
  label: string;
  icon: typeof Sparkles;
  dividerAbove?: boolean;
}> = [
  { id: "remake", label: "用我的食材生成類似料理", icon: Sparkles },
  { id: "shopping", label: "加入採買清單", icon: ShoppingCart },
  { id: "copy", label: "複製食材清單", icon: Copy },
  { id: "share", label: "分享", icon: Share2 },
  { id: "home", label: "回到首頁", icon: Home, dividerAbove: true },
];

export type RecipeActionsMenuProps = {
  recipe: RecipePayload;
  className?: string;
};

export function RecipeActionsMenu({ recipe, className }: RecipeActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const run = async (id: ActionId) => {
    setOpen(false);
    const name = recipe.recipe_name ?? "料理";
    switch (id) {
      case "remake": {
        const q = encodeURIComponent(`${name}，類似料理`);
        router.push(`/app?prefill=${q}`);
        break;
      }
      case "shopping": {
        const items = (recipe.ingredients ?? []).map((ing) => ({
          name: formatIngredient(ing),
          recipeId: recipe.id,
        }));
        const { added } = addIngredientsToShoppingDraft(items);
        toast({ title: "已加入採買清單", description: `共 ${added} 項` });
        break;
      }
      case "copy": {
        const text = (recipe.ingredients ?? [])
          .map((ing) => formatIngredient(ing))
          .join("\n");
        await navigator.clipboard.writeText(text || name);
        toast({ title: "已複製", description: "食材清單已複製到剪貼簿" });
        break;
      }
      case "share": {
        const url = typeof window !== "undefined" ? window.location.href : "";
        if (navigator.share) {
          try {
            await navigator.share({ title: name, url });
          } catch {
            /* cancelled */
          }
        } else {
          await navigator.clipboard.writeText(url);
          toast({ title: "已複製連結" });
        }
        break;
      }
      case "home":
        router.push("/app");
        break;
    }
  };

  const menuBody = (
    <ul className="py-2">
      {ACTIONS.map((action) => (
        <li key={action.id}>
          {action.dividerAbove ? (
            <hr className="my-2 border-border-default" />
          ) : null}
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-body hover:bg-surface-muted"
            onClick={() => void run(action.id)}
          >
            <action.icon className="size-4 shrink-0 text-text-muted" aria-hidden />
            {action.label}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={cn("relative", className)}>
      <IconButton
        size="sm"
        aria-label="更多操作"
        icon={<MoreHorizontal className="size-[18px]" aria-hidden />}
        onClick={() => setOpen(true)}
        className="h-9 w-9 rounded-full"
      />
      <div className="hidden md:block">
        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="關閉選單"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border-default bg-surface-default shadow-lg">
              {menuBody}
            </div>
          </>
        ) : null}
      </div>
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen} side="bottom" title="食譜操作">
          {menuBody}
        </Sheet>
      </div>
    </div>
  );
}
