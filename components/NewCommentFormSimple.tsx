import { useState } from "react";

interface Comment {
  id: string;
  content: string;
  author?: { name: string };
}

export default function NewCommentFormSimple({
  postId,
  onCommentAdded,
}: {
  postId: string;
  onCommentAdded: (comment: Comment) => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);

    const res = await fetch("/api/comments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, content }),
    });

    setLoading(false);

    if (res.ok) {
      const newComment = await res.json();
      onCommentAdded(newComment);
      setContent("");
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
