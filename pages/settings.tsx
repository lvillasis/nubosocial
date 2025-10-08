// pages/settings.tsx
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import ProfileSettings from "@/components/ProfileSettings";
import UserPreferences from "@/components/UserPreferences";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session || !session.user) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  return {
    props: {
      session,
      ...(await serverSideTranslations(context.locale || "es", ["common"])),
    },
  };
}

export default function SettingsPage({ session }: any) {
  const { t } = useTranslation("common");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#07070f] py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column: profile editing */}
        <div className="lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              aria-label="Volver"
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800 dark:text-gray-100">
                {t("editProfile", "Editar Perfil")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("editProfileSubtitle", "Actualiza tu nombre, biografía y foto de perfil.")}
              </p>
            </div>
          </div>

          {/* Aquí incluimos tu componente ProfileSettings (con cropper, upload, etc.) */}
          <ProfileSettings />
        </div>

        {/* Sidebar: preferencias del usuario */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20">
            <div className="bg-white dark:bg-[#0b0b12] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <UserPreferences />
            </div>

            <div className="mt-6">
              {/* espació para anuncios o ayuda */}
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl p-4 text-center text-sm shadow-md">
                📰 Espacio publicitario
                <p className="text-xs mt-1 opacity-80">Tu anuncio aquí</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

