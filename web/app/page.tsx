import { FLAGS } from "@/lib/flags";
import { LandingPage } from "@/components/marketing/LandingPage";
import { ChatPanel } from "@/components/ChatPanel";

export default function HomePage() {
  if (FLAGS.newUI) {
    return <LandingPage />;
  }
  return <ChatPanel />;
}
