"use client";

import { Button } from "@/components/primitives/Button";
import { Chip } from "@/components/primitives/Chip";
import { Card } from "@/components/primitives/Card";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import { ProgressBar } from "@/components/primitives/ProgressBar";
import { Skeleton } from "@/components/primitives/Skeleton";
import { useState } from "react";

export default function ShowcasePage() {
  const [chipOn, setChipOn] = useState(false);
  const [text, setText] = useState("");

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="font-serif text-2xl">Primitives showcase</h1>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-text-muted">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Loading</Button>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-text-muted">Chip</h2>
        <Chip label="台式" selected={chipOn} onClick={() => setChipOn((v) => !v)} />
      </section>
      <section>
        <Card padding="lg">
          <p className="text-text-body">Card content</p>
        </Card>
      </section>
      <section className="space-y-2">
        <Input label="Input" value={text} onChange={setText} placeholder="試打…" />
        <Textarea value={text} onChange={setText} minRows={2} />
        <ProgressBar value={3} max={10} />
        <Skeleton className="h-8 w-full" />
      </section>
    </div>
  );
}
