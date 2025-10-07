import dynamic from "next/dynamic";
import { ReactNode } from "react";

const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });
const NavbarDark = dynamic(() => import("@/components/NavbarDark"), { ssr: false });

interface Props {
  children: ReactNode;
  showNavbar?: boolean;
  useDark?: boolean; // opcional: si quieres elegir entre uno u otro
}

export default function Layout({ children, showNavbar = true, useDark = false }: Props) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-neutral-50 text-black dark:bg-[#0d1117] dark:text-white transition-colors duration-300">
      {showNavbar && (useDark ? <NavbarDark /> : <Navbar />)}
      <main className="flex-1">{children}</main>
    </div>
  );
}
