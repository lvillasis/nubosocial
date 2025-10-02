import React from "react";

interface Post {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    image: string;
  };
}

const PostList = ({ posts }: { posts: Post[] }) => {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-white p-4 rounded shadow">
          <p>{post.content}</p>
          <div className="text-sm text-gray-500 mt-2">
            Por {post.author.name}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;