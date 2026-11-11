import { getCurrentUser } from "@/lib/auth";
import { Header } from "./Header";
import { Footer } from "./Footer";

/** Public page frame: header (aware of the signed-in user), main content, footer. */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <Header user={user ? { email: user.email, isAdmin: Boolean(user.adminRole) } : null} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
