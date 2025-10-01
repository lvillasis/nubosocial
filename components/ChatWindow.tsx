"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Message = {
  id: string;
  conversationId?: string;
  content: string | null;
  attachment?: string | null;
  createdAt: string;
  senderId: string;
  sender?: { id: string; name?: string | null; image?: string | null };
  failed?: boolean;
  pending?: boolean;
};

type Props = {
  conversationId: string;
  currentUserId: string | null;
};

export default function ChatWindow({ conversationId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // info of the conversation (other participant)
  const [other, setOther] = useState<{ id?: string; name?: string | null; image?: string | null } | null>(null);

  // fetch conversation metadata (participants) to display name/avatar in header
  useEffect(() => {
    let mounted = true;
    if (!conversationId) return;
    (async () => {
      try {
        const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`);
        if (!res.ok) {
          // maybe API not present; ignore
          return;
        }
        const conv = await res.json();
        if (!mounted) return;
        // conv.participants shape may vary; find "other"
        const meId = currentUserId;
        const parts = Array.isArray(conv.participants) ? conv.participants : [];
        let oth: any = parts.find((p: any) => {
          const uid = p?.user?.id ?? p?.id ?? p?.userId ?? null;
          return uid && String(uid) !== String(meId);
        });
        if (oth) oth = oth.user ?? oth;
        if (!oth && parts.length > 0) {
          const p0 = parts[0];
          oth = p0.user ?? p0;
        }
        setOther(oth ?? null);
      } catch (_err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [conversationId, currentUserId]);

  // fetch initial messages
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages?limit=200`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load messages");
        const data = await r.json();
        if (!mounted) return;
        setMessages(data || []);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [conversationId]);

  // autoscroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 40);
  }, [messages]);

  // connect socket
  useEffect(() => {
    let s: Socket | null = null;
    let mounted = true;
    async function connect() {
      try {
        const res = await fetch("/api/socket/token");
        if (!res.ok) {
          console.debug("No socket token, skipping realtime.");
          return;
        }
        const j = await res.json();
        const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
        s = io(url, { auth: { token: j.token }, transports: ["websocket", "polling"] });
        if (!mounted) return;
        setSocket(s);

        s.on("connect", () => setConnected(true));
        s.on("disconnect", () => setConnected(false));
        s.on("connect_error", (err: any) => {
          console.warn("Socket error:", err);
          setConnected(false);
        });

        s.on("message", (msg: Message) => {
          if (String(msg.conversationId) !== String(conversationId)) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const idx = prev.findIndex(
              (m) =>
                m.pending &&
                m.senderId === msg.senderId &&
                m.content &&
                msg.content &&
                m.content.trim() === msg.content.trim()
            );
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = msg;
              return copy;
            }
            return [...prev, msg];
          });
        });
      } catch (_err) {
        console.warn("Socket connect failed:", _err);
      }
    }
    connect();
    return () => {
      mounted = false;
      if (s) s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [conversationId]);

  // send message helper
  const sendMessage = async (content: string | null, attachmentUrl?: string | null) => {
    if ((!content || !content.trim()) && !attachmentUrl) return;
    if (!currentUserId) {
      alert("Inicia sesión para enviar mensajes");
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const optimistic: Message = {
      id: tempId,
      conversationId,
      content: content ?? null,
      attachment: attachmentUrl ?? null,
      createdAt: new Date().toISOString(),
      senderId: currentUserId,
      pending: true,
      sender: { id: currentUserId, name: "Tú" },
    };

    setMessages((prev) => [...prev, optimistic]);

    // try socket
    if (socket && socket.connected) {
      socket.emit("send_message", { conversationId, content, attachment: attachmentUrl });
      return;
    }

    // fallback REST
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachment: attachmentUrl }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("REST send error", res.status, text);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true, pending: false } : m)));
      } else {
        const saved = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      }
    } catch (_err) {
      console.error("REST send exception", _err);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true, pending: false } : m)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim(), null);
    setInput("");
  };

  // Cloudinary upload omitted here (keep your original implementation)
  const uploadToCloudinary = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) {
        return reject(new Error("Cloudinary no configurado (env vars faltan)"));
      }
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setUploadProgress(pct);
        }
      };
      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.secure_url || res.url);
          } catch (parseErr) {
            reject(parseErr);
          }
        } else {
          reject(new Error(`Upload failed ${xhr.status}`));
        }
      };
      xhr.onerror = () => {
        setUploadProgress(null);
        reject(new Error("Network error"));
      };
      xhr.send(fd);
    });
  };

  const handleFilePick = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Archivo demasiado grande (máx 8MB)");
      return;
    }
    try {
      const url = await uploadToCloudinary(file);
      await sendMessage(null, url);
    } catch (_err) {
      console.error("Upload error", _err);
      alert("No se pudo subir la imagen");
    }
  };

  const renderBubble = (m: Message) => {
    const fromMe = m.senderId === currentUserId;
    const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      <div key={m.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[78%] p-3 rounded-2xl ${fromMe ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white" : "bg-gray-100 text-gray-900"}`}>
          {!fromMe && <div className="text-xs font-medium text-gray-700 mb-1">{m.sender?.name || "Usuario"}</div>}
          {m.attachment && (
            <div className="mb-2">
              <img src={m.attachment} alt="attachment" className="max-h-44 w-auto rounded-md object-cover" />
            </div>
          )}
          <div className="whitespace-pre-wrap">{m.content}</div>
          <div className="flex items-center justify-between text-[10px] mt-2 text-gray-300">
            <span>{time}</span>
            <span>{m.pending ? "Enviando…" : m.failed ? "Error" : fromMe ? "Enviado" : ""}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[70vh] w-full border rounded-xl overflow-hidden bg-white dark:bg-[#071018]">
      {/* header: show other participant + socket status */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-sm ${connected ? "ring-2 ring-green-400" : "ring-0"}`}>
            {other?.image ? (
              // use plain img to avoid next/image domain issues in dev
              <img src={other.image} alt={other.name ?? "Avatar"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">{(other?.name || (other as any)?.username || "U").charAt(0)}</span>
            )}
          </div>

          <div>
            <div className="font-semibold">{other?.name ?? (other as any)?.username ?? "Chat"}</div>
            <div className="text-xs text-gray-500">{connected ? "En línea" : "Conectando..."}</div>
          </div>
        </div>

        <div className="text-xs text-gray-400">Mensajería segura</div>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
        {loading && <div className="text-center text-gray-400">Cargando mensajes…</div>}
        {!loading && messages.length === 0 && <div className="text-center text-gray-400">Sin mensajes — empieza la conversación 👋</div>}
        {messages.map(renderBubble)}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t bg-white/5 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-full border px-4 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Escribe un mensaje"
        />
        <input ref={fileInputRef} onChange={handleFilePick} accept="image/*" type="file" className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded-full hover:bg-white/10" title="Adjuntar imagen">
          📷
        </button>

        <button type="submit" disabled={sending} className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </form>

      {uploadProgress !== null && (
        <div className="h-2 bg-gray-200">
          <div style={{ width: `${uploadProgress}%` }} className="h-full bg-blue-500 transition-all" />
        </div>
      )}
    </div>
  );
}
