import {
  formatDateSubtitle,
  timeOfDayGreeting,
  timeOfDaySubtitle,
} from "@/lib/utils/greeting";

export function GreetingHeader({ now = new Date() }: { now?: Date }) {
  return (
    <header className="mb-5 sm:mb-7">
      <h1 className="font-serif text-[2rem] leading-tight text-text-ink sm:text-5xl sm:font-medium">
        {timeOfDayGreeting(now)}
      </h1>
      <p className="mt-1 text-xs text-text-muted">
        {formatDateSubtitle(now)} · {timeOfDaySubtitle(now)}
      </p>
    </header>
  );
}
