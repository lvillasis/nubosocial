import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
      setResults(res.data);
    } catch (_err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 transition-colors duration-300">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar usuarios, publicaciones o hashtags"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 px-4 py-2 rounded w-full bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          Buscar
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((item: any) =>
            item.type === "user" ? (
              <Link
                key={item.id}
                href={`/user/${item.username}`}
                className="block text-blue-600 hover:underline"
              >
                @{item.username} - {item.name}
              </Link>
            ) : item.type === "post" ? (
              <div
                key={item.id}
                className="border border-gray-300 dark:border-gray-700 p-2 rounded bg-gray-100 dark:bg-gray-800 text-black dark:text-white transition-colors"
              >
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <Link
                    href={`/user/${item.authorUsername}`}
                    className="hover:underline text-blue-600 dark:text-blue-400"
                  >
                    @{item.authorUsername}
                  </Link>
                </p>
                <p>{item.content}</p>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>    
  );
}

