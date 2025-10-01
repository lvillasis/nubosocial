// lib/withProtectedPage.ts
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { prisma } from "@/lib/prisma";

export async function withProtectedPage(
  context: GetServerSidePropsContext,
  namespaces: string[] = ["common"]
): Promise<GetServerSidePropsResult<any>> {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session || !session.user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const userInDb = await prisma.user.findUnique({
    where: { email: session.user.email || "" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
    },
  });

  return {
    props: {
      session,
      userInDb,
      ...(await serverSideTranslations(context.locale || "es", namespaces)),
    },
  };
}
