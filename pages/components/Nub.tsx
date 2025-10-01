type NubProps = {
  username: string;
  content: string;
};

export default function Nub({ username, content }: NubProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow animate-fade-in">
      <p className="font-semibold text-gray-900 dark:text-white">@{username}</p>
      <p className="text-gray-700 dark:text-gray-300 mt-1">{content}</p>
    </div>
  );
}