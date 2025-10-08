// pages/messages/index.tsx
import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { io, Socket } from "socket.io-client";

const ConversationList = dynamic(() => import("../../components/ConversationList"), { ssr: false });
const ChatWindow = dynamic(() => import("../../components/ChatWindow"), { ssr: false });

type SearchResult = {
  id: string;
  type: "user" | "post" | string;
  username?: string;
  name?: string;
  image?: string | null;
  content?: string;
};

export default function MessagesIndexPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // theme persisted
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // socket
  const [socket, setSocket] = useState<Socket | null>(null);

  // compose modal
  const [composeOpen, setComposeOpen] = useState(false);

  // delete flow
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // persist/restore theme
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("messages_theme") : null;
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem("messages_theme", theme);
    } catch {}
  }, [theme]);

  // --- Robust fetch + normalize ---
  const normalizeConversations = (convs: any[], meId: string | null) => {
    return (convs || []).map((c: any) => {
      // participants normalization (support various shapes)
      const parts = Array.isArray(c.participants)
        ? c.participants.map((p: any) => {
            if (!p) return p;
            if (p.user) return { user: { id: String(p.user.id), name: p.user.name ?? null, username: p.user.username ?? null, image: p.user.image ?? null } };
            if (p.id && (p.name || p.username || p.image)) return { user: { id: String(p.id), name: p.name ?? null, username: p.username ?? null, image: p.image ?? null } };
            if (p.userId) return { user: { id: String(p.userId), name: p.name ?? null, username: p.username ?? null, image: p.image ?? null } };
            return { user: p };
          })
        : [];

      // lastMessage normalization
      const lastMessage = c.lastMessage ?? (Array.isArray(c.messages) ? c.messages[0] : null) ?? null;

      // friendly title fallback (other participant)
      const other = parts.find((pp: any) => String(pp?.user?.id ?? "") !== String(meId))?.user;
      const title = c.title ?? other?.name ?? other?.username ?? `Conversación ${String(c.id ?? "").slice(0, 6)}`;

      return {
        ...c,
        participants: parts,
        title,
        lastMessage,
        unreadCount: Number(c.unreadCount ?? c.unread ?? 0),
        __flash: !!c.__flash,
      };
    });
  };

  const fetchConversations = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) {
        console.warn("GET /api/conversations responded", res.status);
        setConversations([]);
        return;
      }
      const data = await res.json();
      // accept many shapes
      let convs: any[] = [];
      if (Array.isArray(data)) convs = data;
      else if (Array.isArray(data.conversations)) convs = data.conversations;
      else if (Array.isArray(data.items)) convs = data.items;
      else if (Array.isArray(data.data)) convs = data.data;
      else if (data && data.id && (data.participants || data.messages)) convs = [data]; // single conv
      else convs = [];

      const meId = (session?.user as any)?.id ?? null;
      const normalized = normalizeConversations(convs, meId);
      setConversations(normalized);
    } catch (_err) {
      console.error("Error fetching conversations:", _err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // respect URL id only (no auto-select)
  useEffect(() => {
    const urlId = Array.isArray(router.query?.id) ? router.query.id[0] : router.query?.id;
    setSelectedId(urlId ? String(urlId) : null);
  }, [router.query?.id]);

  // search debounce
  useEffect(() => {
    if (!query || query.trim() === "") {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let mounted = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          if (!mounted) return;
          setSearchResults([]);
        } else {
          const data = await res.json();
          if (!mounted) return;
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (_err) {
        console.error("Search error", _err);
        if (!mounted) return;
        setSearchResults([]);
      } finally {
        if (mounted) setSearching(false);
      }
    }, 300);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [query]);

  // create/open conversation (POST /api/conversations) with fallback
  const createOrOpenConversation = async (userId: string, username?: string) => {
    try {
      const existing = conversations.find((c: any) => {
        const parts = c.participants ?? [];
        return parts.some((p: any) => {
          const pid = p?.user?.id ?? p?.userId ?? p?.id ?? null;
          return String(pid) === String(userId);
        });
      });

      if (existing) {
        const id = String(existing.id);
        setSelectedId(id);
        router.push({ pathname: "/messages", query: { id } }, undefined, { shallow: true });
        setQuery("");
        setSearchResults([]);
        setComposeOpen(false);
        try {
          // try conversations read endpoint, but if yours is /api/messages/:id/read it will fail silently
          await fetch(`/api/conversations/${encodeURIComponent(id)}/read`, { method: "POST" });
        } catch {
          try {
            await fetch(`/api/messages/${encodeURIComponent(id)}/read`, { method: "POST" });
          } catch {}
        }
        return;
      }

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] }),
      });

      if (res.ok) {
        const conv = await res.json();
        await fetchConversations();
        const id = String(conv.id);
        setSelectedId(id);
        router.push({ pathname: "/messages", query: { id } }, undefined, { shallow: true });
        setQuery("");
        setSearchResults([]);
        setComposeOpen(false);
        return;
      }

      console.warn("/api/conversations POST failed:", res.status);
      if (username) router.push(`/messages/new?to=${encodeURIComponent(username)}`);
      else router.push("/messages/new");
      setComposeOpen(false);
    } catch (_err) {
      console.error("create conversation error:", _err);
      if (username) router.push(`/messages/new?to=${encodeURIComponent(username)}`);
      else router.push("/messages/new");
      setComposeOpen(false);
    }
  };

  // socket: notifications + preview updates
  useEffect(() => {
    if (!session) return;
    let mounted = true;
    let s: Socket | null = null;

    async function start() {
      try {
        const tokenRes = await fetch("/api/socket/token");
        if (!tokenRes.ok) return;
        const j = await tokenRes.json();
        const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
        s = io(url, { auth: { token: j.token }, transports: ["websocket", "polling"] });
        if (!mounted) return;
        setSocket(s);

        s.on("message", (msg: any) => {
          const convId = String(msg.conversationId ?? msg.conversation?.id ?? "");
          if (!convId) return;
          // if the message belongs to currently open conversation, update preview & do nothing
          if (String(selectedId) === convId) {
            setConversations((prev) =>
              prev.map((c: any) =>
                String(c.id) === convId ? { ...c, lastMessage: { content: msg.content ?? msg.text ?? "", createdAt: msg.createdAt ?? new Date().toISOString(), sender: msg.sender } } : c
              )
            );
            return;
          }

          // otherwise increment unreadCount and flash
          setConversations((prev) => {
            const exists = prev.some((c: any) => String(c.id) === convId);
            if (!exists) return prev;
            return prev.map((c: any) => {
              if (String(c.id) !== convId) return c;
              const newCount = (Number(c.unreadCount ?? c.unread ?? 0) || 0) + 1;
              return { ...c, unreadCount: newCount, __flash: true, lastMessage: { content: msg.content ?? msg.text ?? "", createdAt: msg.createdAt ?? new Date().toISOString(), sender: msg.sender } };
            });
          });

          // remove flash after 3s
          setTimeout(() => {
            setConversations((prev) => prev.map((c: any) => (String(c.id) === convId ? { ...c, __flash: false } : c)));
          }, 3000);
        });
      } catch (_err) {
        console.warn("Socket connect failed:", _err);
      }
    }

    start();
    return () => {
      mounted = false;
      if (s) s.disconnect();
      setSocket(null);
    };
  }, [session, selectedId]);

  // mark as read on server (best-effort)
  const markAsReadOnServer = async (id: string) => {
    try {
      await fetch(`/api/conversations/${encodeURIComponent(id)}/read`, { method: "POST" });
    } catch {
      try {
        await fetch(`/api/messages/${encodeURIComponent(id)}/read`, { method: "POST" });
      } catch {
        /* ignore */
      }
    }
  };

  // handle select
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setConversations((prev) => prev.map((c: any) => (String(c.id) === String(id) ? { ...c, unreadCount: 0, __flash: false } : c)));
    markAsReadOnServer(id);
    router.push({ pathname: "/messages", query: { id } }, undefined, { shallow: true });
  };

  // --- DELETE conversation: confirm + call API ---
  const onRequestDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(deleteTargetId)}`, { method: "DELETE" });
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      if (!res.ok) {
        const msg = payload?.error ?? payload?.message ?? `Error ${res.status}`;
        alert(`No se pudo eliminar la conversación: ${msg}`);
        setDeleting(false);
        setDeleteTargetId(null);
        return;
      }

      setConversations((prev) => prev.filter((c: any) => String(c.id) !== String(deleteTargetId)));
      if (String(selectedId) === String(deleteTargetId)) {
        setSelectedId(null);
        router.push("/messages", undefined, { shallow: true });
      }

      setDeleting(false);
      setDeleteTargetId(null);
    } catch (_err) {
      console.error("Delete request error:", _err);
      alert("Error de red al intentar eliminar la conversación.");
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTargetId(null);
  };

  if (!session) return <p className="p-6">Inicia sesión para ver tus conversaciones.</p>;
  if (loading) return <p className="p-6">Cargando conversaciones…</p>;

  return (
    <div className={theme === "light" ? "bg-white text-slate-900 min-h-screen" : "bg-gray-900 text-gray-100 min-h-screen"}>
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[24rem_1fr] gap-6">
        {/* LEFT */}
        <aside className={theme === "light" ? "col-span-1 bg-white border rounded-2xl p-4 shadow-sm" : "col-span-1 bg-gray-900/30 border border-gray-800 rounded-2xl p-4"}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Mensajes</h1>
              <p className="text-sm text-gray-400">Tu bandeja de mensajes — escribe a tus contactos</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} title="Cambiar tema" className="p-2 rounded-md border border-gray-700/30 text-sm">
                {theme === "dark" ? "🌞" : "🌙"}
              </button>

              <button onClick={() => setComposeOpen(true)} className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-gray-700 text-sm hover:bg-gray-800" title="Nuevo mensaje">
                + Nuevo
              </button>
            </div>
          </div>

          {/* search */}
          <div className="mb-4">
            <div className={theme === "light" ? "flex items-center gap-2 bg-gray-100 border rounded-md px-3 py-2" : "flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-md px-3 py-2"}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar usuarios o posts..." className={theme === "light" ? "bg-transparent outline-none text-sm w-full" : "bg-transparent outline-none text-sm w-full text-gray-200"} aria-label="Buscar" />
              {searching && <div className="text-xs text-gray-400">…</div>}
            </div>

            {query.trim().length > 0 && (
              <div className={theme === "light" ? "mt-2 bg-white border rounded-md shadow-sm max-h-72 overflow-auto" : "mt-2 bg-gray-900/80 border border-gray-800 rounded-md max-h-72 overflow-auto"}>
                {searchResults.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400">No hay resultados</div>
                ) : (
                  <div className="divide-y divide-gray-800/30">
                    {searchResults.map((r) => {
                      if (r.type === "user") {
                        return (
                          <button key={r.id} onClick={() => createOrOpenConversation(r.id, r.username)} className="w-full text-left p-3 hover:bg-gray-800/40 flex gap-3 items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm text-gray-200 overflow-hidden">
                              {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" /> : (r.name || r.username || "?").charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{highlightText(r.name ?? r.username ?? "", query)}</div>
                              <div className="text-xs text-gray-400 truncate">{r.username ? `@${r.username}` : ""}</div>
                            </div>
                          </button>
                        );
                      }
                      return (
                        <div key={r.id} className="p-3 hover:bg-gray-800/30">
                          <div className="text-sm line-clamp-2">{highlightText(r.content ?? "", query)}</div>
                          <div className="text-xs text-gray-400 mt-1">{r.type}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* conversation list */}
          <div className="h-[68vh] overflow-y-auto rounded-md">
            <ConversationList
              conversations={conversations}
              currentUserId={(session.user as any).id}
              selectedId={selectedId}
              onSelect={handleSelect}
              onDelete={onRequestDelete}
              highlightQuery={query}
            />
          </div>
        </aside>

        {/* RIGHT */}
        <main className="col-span-1">
          <div className={theme === "light" ? "h-[72vh] border border-gray-200 rounded-xl overflow-hidden bg-white flex" : "h-[72vh] border border-gray-800 rounded-xl overflow-hidden bg-gradient-to-b from-gray-950 to-gray-900 flex"}>
            {selectedId ? (
              <ChatWindow conversationId={String(selectedId)} currentUserId={(session.user as any).id ?? null} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 w-28 h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Selecciona una conversación</h2>
                <p className="text-sm text-gray-400 max-w-[56ch]">Aquí aparecerá el chat de la conversación seleccionada. Usa <strong>+ Nuevo</strong> para escribir a alguien o busca contactos arriba.</p>

                <div className="mt-6 flex gap-3">
                  <button onClick={() => setComposeOpen(true)} className="px-4 py-2 bg-blue-600 rounded-md text-white">Nuevo mensaje</button>
                  <button onClick={() => fetchConversations()} className="px-4 py-2 border rounded-md text-sm">Refrescar</button>
                </div>

                {conversations?.length > 0 && (
                  <div className="mt-6 text-xs text-gray-500">
                    <strong className="text-gray-200">{conversations.length}</strong> conversaciones en total
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <ComposeModal onClose={() => setComposeOpen(false)} onSelectUser={(userId, username) => createOrOpenConversation(userId, username)} />
      )}

      {/* Confirm delete modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelDelete} />
          <div className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">¿Eliminar conversación?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Estás a punto de eliminar esta conversación. <strong>Esta acción no se puede deshacer</strong> y los mensajes se perderán permanentemente. ¿Estás seguro?</p>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={handleCancelDelete} className="px-4 py-2 border rounded-md text-sm">Cancelar</button>
              <button onClick={handleDeleteConfirmed} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-md">
                {deleting ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Highlighter helper (used inline in JSX above) */
function highlightText(text?: string | null, q?: string) {
  if (!q) return text ?? "";
  try {
    const safe = String(text ?? "");
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim();
    if (!esc) return safe;
    const re = new RegExp(`(${esc})`, "ig");
    const parts = safe.split(re);
    return (
      <>
        {parts.map((p, i) => (re.test(p) ? <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">{p}</mark> : <span key={i}>{p}</span>))}
      </>
    );
  } catch {
    return text ?? "";
  }
}

/** Compose modal (simple) */
function ComposeModal({ onClose, onSelectUser }: { onClose: () => void; onSelectUser: (userId: string, username?: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.trim() === "") {
      setResults([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          if (!mounted) return setResults([]);
        } else {
          const data = await res.json();
          if (!mounted) return;
          setResults(Array.isArray(data) ? data.filter((d: any) => d.type === "user") : []);
        }
      } catch (_err) {
        console.error("compose search error", _err);
        if (!mounted) return;
        setResults([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-gray-900 text-gray-100 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Nuevo mensaje</h3>
          <button onClick={onClose} className="text-sm px-2 py-1 border rounded-md">Cerrar</button>
        </div>

        <div className="mb-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar usuario por nombre o @usuario..." className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none" />
        </div>

        <div className="max-h-60 overflow-auto rounded-md border border-gray-800">
          {loading && <div className="p-3 text-sm text-gray-400">Buscando…</div>}
          {!loading && results.length === 0 && <div className="p-3 text-sm text-gray-400">Escribe para buscar usuarios</div>}
          {!loading && results.map((r) => (
            <button key={r.id} onClick={() => { onSelectUser(r.id, r.username); onClose(); }} className="w-full text-left px-3 py-2 hover:bg-gray-800/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm overflow-hidden">
                {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" /> : (r.name || r.username || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.name ?? r.username}</div>
                <div className="text-xs text-gray-400 truncate">{r.username ? `@${r.username}` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}