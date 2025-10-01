import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface PostDetailProps {
  post: any; // Si tienes el tipo de Post, cámbialo aquí
}

export default function PostDetail({ post }: PostDetailProps) {
  if (!post) return null;

  return (
    <div className="p-4">
      {/* Autor */}
      <div className="flex items-center space-x-3">
        <img
          src={post.author.image || "/default-avatar.png"}
          alt={post.author.name}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-bold">{post.author.name}</p>
          <p className="text-sm text-gray-500">@{post.author.username}</p>
        </div>
      </div>

      {/* Contenido */}
      <p className="mt-4 text-lg">{post.content}</p>

      {/* Imagen */}
      {post.image && (
        <img
          src={post.image}
          alt="Post"
          className="mt-3 rounded-xl max-h-[500px] object-cover"
        />
      )}

      {/* Fecha */}
      <p className="text-sm text-gray-400 mt-2">
        {formatDistanceToNow(new Date(post.createdAt), {
          addSuffix: true,
          locale: es,
        })}
      </p>

      {/* Acciones */}
      <div className="flex space-x-6 mt-4 border-y py-3 text-gray-500">
        <button className="hover:text-blue-500">💬 {post.comments?.length}</button>
        <button className="hover:text-pink-500">
          ❤️ {post.likesCount}
        </button>
      </div>

      {/* Lista de comentarios */}
      <div className="mt-4 space-y-3">
        {post.comments?.map((comment: any) => (
          <div key={comment.id} className="border-b pb-2">
            <p className="font-semibold">{comment.author.name}</p>
            <p className="text-sm">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
