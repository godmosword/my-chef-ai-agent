import { Suspense } from "react";
import CookPageLoader from "./CookPageLoader";

export default function CookPage() {
  return (
    <Suspense
      fallback={
        <div className="cooking-mode flex min-h-screen items-center justify-center text-text-ink">
          載入烹飪模式…
        </div>
      }
    >
      <CookPageLoader />
    </Suspense>
  );
}
