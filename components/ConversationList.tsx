"use client";

import React from "react";
import Image from "next/image";

interface Conversation {
  id: string;
  title?: string | null;
  participants?: any[];
  lastMessage?: { content?: string | null; createdAt?: string | null; sender?: any } | null;
  messages?: any[]; // fallback shape
  unreadCount?: number;
  __flash?: boolean;
}

interface Props {
  conversations: Conversation[];
  currentUserId: string;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  selectedId?: string | null;
  highlightQuery?: string;
}

export default function ConversationList({
  conversations,
  currentUserId,
  onSelect,
  onDelete,
  selectedId,
  highlightQuery,
}: Props) {
  if (!conversations || conversations.length === 0) {
    return <div className="p-4 text-center text-gray-400">No tienes conversaciones.</div>;
  }

  const getOther = (conv: Conversation) => {
    const parts = Array.isArray(conv.participants) ? conv.participants : [];

    // 1) try shape: { user: { id, name, username, image } }
    let other = parts.find((p: any) => {
      const uid = p?.user?.id ?? p?.id ?? p?.userId ?? null;
      return uid && String(uid) !== String(currentUserId);
    });

    if (other) return (other.user ?? other);

    // 2) fallback: first participant that isn't currentUser
    const fallback = parts.find((p: any) => {
      const uid = p?.user?.id ?? p?.id ?? p?.userId ?? null;
      return uid && String(uid) !== String(currentUserId);
    });
    if (fallback) return (fallback.user ?? fallback);

    // 3) last fallback: if participants are users directly
    if (parts.length > 0) {
      const p0 = parts[0];
      return p0.user ?? p0;
    }

    return null;
  };

  const highlight = (text: string | null | undefined, q?: string) => {
    const safeText = String(text ?? "");
    if (!q || !q.trim()) return <>{safeText}</>;
    try {
      const clean = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${clean})`, "ig");
      const parts = safeText.split(regex);
      return (
        <>
          {parts.map((p, i) =>
            regex.test(p) ? (
              <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">
                {p}
              </mark>
            ) : (
              <span key={i}>{p}</span>
            )
          )}
        </>
      );
    } catch {
      return <>{safeText}</>;
    }
  };

  return (
    <div className="divide-y divide-gray-700">
      {conversations.map((conv) => {
        const other = getOther(conv) as any;
        const title = conv.title ?? (other?.name ?? other?.username ?? `Conversación`);
        // <-- aquí usamos lastMessage OR conv.messages[0] (que tu API suele devolver)
        const lastText =
          (conv.lastMessage && conv.lastMessage.content) ??
          (Array.isArray(conv.messages) && conv.messages[0]?.content) ??
          "";
        const lastDateStr =
          (conv.lastMessage && conv.lastMessage.createdAt) ??
          (Array.isArray(conv.messages) && conv.messages[0]?.createdAt) ??
          null;
        const lastDate = lastDateStr ? new Date(lastDateStr).toLocaleDateString() : null;

        const unread = Number(conv.unreadCount ?? 0);
        const isSelected = selectedId && String(selectedId) === String(conv.id);

        const rootClasses = [
          "flex items-center gap-3 p-3 rounded-md",
          isSelected ? "bg-gray-800/60" : "hover:bg-gray-800/10",
          conv.__flash ? "ring-2 ring-rose-500" : "",
        ].join(" ");

        return (
          <div key={conv.id} className="w-full">
            <button
              onClick={() => onSelect?.(conv.id)}
              className="w-full text-left"
              aria-label={`Abrir conversación ${title}`}
              type="button"
            >
              <div className={rootClasses}>
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-lg text-white flex-shrink-0">
                  {other?.image ? (
                    // fallback: if next/image blocked by domains, it will still try; if it fails, browser shows alt
                    <Image src={other.image} alt={other?.name ?? "Avatar"} fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="text-lg">{(other?.name || other?.username || "?").charAt(0)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate text-sm">{highlight(title, highlightQuery)}</div>
                    {unread > 0 && (
                      <span
                        className="ml-2 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded-full"
                        aria-label={`${unread} mensajes sin leer`}
                      >
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 truncate mt-1">{highlight(lastText || "Sin mensajes aún", highlightQuery)}</div>
                </div>

                <div className="text-[11px] text-gray-400 ml-3 mr-1">{lastDate}</div>

                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    title="Eliminar conversación"
                    aria-label={`Eliminar conversación ${title}`}
                    className="ml-2 p-1 rounded hover:bg-red-600 hover:text-white text-gray-300"
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
