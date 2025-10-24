// Mark all admin pages as dynamic (render at runtime, not build time)
// This prevents Netlify build failures when Supabase credentials aren't available
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
