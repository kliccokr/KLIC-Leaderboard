import { signIn } from "@/auth";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "auth" });

  const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const hasGitHub = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

  const signInWithGoogle = async () => {
    "use server";

    await signIn("google", { redirectTo: `/${lang}` });
  };

  const signInWithGitHub = async () => {
    "use server";

    await signIn("github", { redirectTo: `/${lang}` });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6 p-8 rounded-xl border border-border bg-card shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("loginTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("loginSubtitle")}</p>
        </div>

        {!hasGoogle && !hasGitHub && (
          <p className="text-center text-sm text-muted-foreground">
            OAuth providers not configured. Set AUTH_GOOGLE_ID/SECRET or AUTH_GITHUB_ID/SECRET in .env
          </p>
        )}

        <div className="space-y-3">
          {hasGoogle && (
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="block w-full px-4 py-2.5 rounded-lg border border-border bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors text-center"
              >
                {t("googleLogin")}
              </button>
            </form>
          )}

          {hasGitHub && (
            <form action={signInWithGitHub}>
              <button
                type="submit"
                className="block w-full px-4 py-2.5 rounded-lg border border-border bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors text-center"
              >
                {t("githubLogin")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
