// pages/messages/[id].tsx
import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

const ChatWindow = dynamic(() => import("../../components/ChatWindow"), { ssr: false });

export default function ConversationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const currentUserId = (session?.user as any)?.id ?? null;

  // Mark conversation as read on mount (best-effort)
  useEffect(() => {
    if (!id || !session) return;
    const convId = String(id);
    (async () => {
      try {
        await fetch(`/api/conversations/${encodeURIComponent(convId)}/read`, { method: "POST" });
      } catch (err) {
        // ignore, endpoint may not exist — don't break page
        // console.debug("mark read failed", err);
      }
    })();
  }, [id, session]);

  if (!session) return <p className="p-6">Inicia sesión para ver la conversación.</p>;
  if (!id) return <p className="p-6">Cargando…</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <ChatWindow conversationId={String(id)} currentUserId={currentUserId} />
    </div>
  );
}
