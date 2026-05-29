import { ChatPanel } from "@/components/ChatPanel";

/**
 * @deprecated Classic single-panel chat UI (pre Prompt 3 shell).
 * Scheduled for removal after NEW_UI is the only production entry.
 */
export default function LegacyChatPage() {
  return <ChatPanel />;
}
