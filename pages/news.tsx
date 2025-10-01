// pages/news.tsx
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import Link from "next/link";
import Image from "next/image";
import { Session } from "next-auth";

interface NewsProps {
  session: Session;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
      ...(await serverSideTranslations(context.locale || "es", ["common"])),
    },
  };
}

export default function NewsPage({ session }: NewsProps) {
  const { t } = useTranslation("common");
  const user = session?.user;

  const dummyNews = [
    {
      id: 1,
      title: "NUBO lanza su nueva función de exploración",
      summary:
        "Explora las publicaciones más populares de toda la plataforma, ahora con filtros personalizados.",
      image: "/news1.jpg",
    },
    {
      id: 2,
      title: "Consejos para mejorar tu perfil",
      summary: "Personaliza tu avatar, añade una biografía y mejora tu presencia en NUBO.",
      image: "/news2.jpg",
    },
    {
      id: 3,
      title: "Lo más destacado esta semana",
      summary: "Un resumen de las publicaciones más vistas, compartidas y comentadas.",
      image: "/news3.jpg",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">{t("Noticias recientes")}</h1>

        <div className="space-y-6">
          {dummyNews.map((news) => (
            <div key={news.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48 w-full">
                <Image
                  src={news.image}
                  alt={news.title}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-t-lg"
                />
              </div>
              <div className="p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{news.title}</h2>
                <p className="text-gray-600">{news.summary}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/">
            <button className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              {t("Ir al inicio")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

