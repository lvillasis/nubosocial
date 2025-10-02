import { useEffect, useState } from "react";

type UserDto = {
  id: string;
  name: string;
  username: string;
  email: string;
  image?: string | null;
  coverImage?: string | null;
};

export default function ProfileHeader() {
  const [user, setUser] = useState<UserDto | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user/me");
      if (!res.ok) return;
      const data: UserDto = await res.json();
      setUser(data);
    })();
  }, []);

  if (!user) return null;

  return (
    <div className="pt-20 px-6 pb-6 border-b border-gray-700">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-bold">{user.name}</h2>
          <p className="text-gray-400 text-sm">@{user.username}</p>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
