import { formatDateSubtitle, timeOfDayGreeting } from "@/lib/utils/greeting";

export function GreetingHeader({ now = new Date() }: { now?: Date }) {
  return (
    <header>
      <h1 className="font-serif text-2xl text-text-ink">{timeOfDayGreeting(now)}</h1>
      <p className="mt-1 text-sm text-text-muted">{formatDateSubtitle(now)}</p>
    </header>
  );
}
