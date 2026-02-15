import { revalidatePath } from "next/cache";
import { getTiendaCmsSettings, saveTiendaCmsSettings } from "@/lib/services/tiendaCmsService";

async function saveSettingsAction(formData: FormData) {
  "use server";

  await saveTiendaCmsSettings({
    heroTitle: String(formData.get("heroTitle") || ""),
    heroSubtitle: String(formData.get("heroSubtitle") || ""),
    supportEmail: String(formData.get("supportEmail") || ""),
    supportPhone: String(formData.get("supportPhone") || ""),
  });

  revalidatePath("/tienda-admin/settings");
  revalidatePath("/tienda");
}

export default async function TiendaAdminSettingsPage() {
  const settings = await getTiendaCmsSettings();

  return (
    <main>
      <h2 className="font-editors-note text-4xl font-light">Ajustes de Tienda</h2>
      <p className="mt-1 text-sm text-black/60">Contenido editable guardado en `settings` de Supabase.</p>

      <form action={saveSettingsAction} className="mt-6 space-y-4 rounded-2xl border border-black/10 p-5">
        <div>
          <label htmlFor="heroTitle" className="mb-1 block text-sm font-medium">
            Titulo principal
          </label>
          <input
            id="heroTitle"
            name="heroTitle"
            defaultValue={settings.heroTitle}
            className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="heroSubtitle" className="mb-1 block text-sm font-medium">
            Subtitulo principal
          </label>
          <input
            id="heroSubtitle"
            name="heroSubtitle"
            defaultValue={settings.heroSubtitle}
            className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="supportEmail" className="mb-1 block text-sm font-medium">
              Correo de soporte
            </label>
            <input
              id="supportEmail"
              name="supportEmail"
              defaultValue={settings.supportEmail}
              className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="supportPhone" className="mb-1 block text-sm font-medium">
              Telefono de soporte
            </label>
            <input
              id="supportPhone"
              name="supportPhone"
              defaultValue={settings.supportPhone}
              className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-black/60">
            Ultima actualizacion: {new Date(settings.updatedAt).toLocaleString("es-MX")}
          </p>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-accent/90"
          >
            Guardar ajustes
          </button>
        </div>
      </form>
    </main>
  );
}
