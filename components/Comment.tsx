interface CommentProps {
  username: string;
  content: string;
}

export default function Comment({ username, content }: CommentProps) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl shadow-sm">
      <p className="font-semibold text-gray-800 dark:text-gray-200">@{username}</p>
      <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}
