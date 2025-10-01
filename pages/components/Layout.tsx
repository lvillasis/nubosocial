// components/Layout.tsx
import Navbar from "@/pages/components/Navbar";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  showNavbar?: boolean;
}

export default function Layout({ children, showNavbar = true }: Props) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-100 text-gray-800 dark:bg-[#0d1117] dark:text-white transition-all duration-300min-h-screen flex flex-col font-sans bg-neutral-50 dark:bg-[#0d1117] text-black dark:text-white transition-colors duration-300">
      {showNavbar && <Navbar />}
      <main className="flex-1">{children}</main>
    </div>
  );
}