// components/NewCommentFormFull.tsx
import { useState } from "react";
import type { PostWithRelations } from "@/types/domain";

export default function NewCommentFormFull({
  postId,
  onCommentAdded,
}: {
  postId: string;
  onCommentAdded: (updatedPost: PostWithRelations) => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/comments/create?includePost=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content }),
      });

      setLoading(false);

      if (res.ok) {
        const json = await res.json();
        // tu endpoint devuelve directamente el post actualizado
        const updatedPost = (json as any) as PostWithRelations;
        onCommentAdded(updatedPost);
        setContent("");
      } else {
        console.error("Error creando comentario:", await res.text());
      }
    } catch (err) {
      setLoading(false);
      console.error("Network error creando comentario:", err);
    }
  };

  return (
    <div className="mt-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe un comentario..."
        className="w-full p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        rows={2}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm rounded-full transition disabled:opacity-50"
        >
          {loading ? "Comentando..." : "Comentar"}
        </button>
      </div>
    </div>
  );
}