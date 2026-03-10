import Link from 'next/link'
import { getTiendaCmsSettings } from '@/lib/services/tiendaCmsService'
import { Instagram, MessageCircle, Music2 } from 'lucide-react'
import { TiendaLogo } from './TiendaLogo'
import {
  TIENDA_INSTAGRAM_URL,
  TIENDA_SUPPORT_WHATSAPP_LABEL,
  TIENDA_SUPPORT_WHATSAPP_URL,
  TIENDA_TIKTOK_URL,
} from '@/lib/tiendaContact'

export async function TiendaFooter() {
  const settings = await getTiendaCmsSettings()

  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <TiendaLogo className="text-2xl" />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {settings.heroSubtitle}
            </p>
            <span className="tienda-pill mt-4">Design System v2.4</span>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4">Tienda</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/tienda" className="hover:text-accent transition-colors">Todos los productos</Link></li>
              <li><Link href="/tienda/categorias" className="hover:text-accent transition-colors">Categorías</Link></li>
              <li><Link href="/tienda/seminuevos" className="hover:text-accent transition-colors">Seminuevos</Link></li>
              <li><Link href="/tienda/favoritos" className="hover:text-accent transition-colors">Favoritos</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4">Ayuda</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/tienda/envios" className="hover:text-accent transition-colors">Envíos</Link></li>
              <li><Link href="/tienda/devoluciones" className="hover:text-accent transition-colors">Devoluciones</Link></li>
              <li><Link href="/tienda/pagos" className="hover:text-accent transition-colors">Pagos seguros</Link></li>
              <li><Link href="/tienda/garantia" className="hover:text-accent transition-colors">Garantía</Link></li>
              <li><a href={`mailto:${settings.supportEmail}`} className="hover:text-accent transition-colors">{settings.supportEmail}</a></li>
              <li><a href={`tel:${settings.supportPhone}`} className="hover:text-accent transition-colors">{settings.supportPhone}</a></li>
              <li>
                <a
                  href={TIENDA_SUPPORT_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  WhatsApp: {TIENDA_SUPPORT_WHATSAPP_LABEL}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/tienda/privacidad" className="hover:text-accent transition-colors">Privacidad</Link></li>
              <li><Link href="/tienda/terminos" className="hover:text-accent transition-colors">Términos</Link></li>
              <li><Link href="/tienda/garantia" className="hover:text-accent transition-colors">Garantía</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
            © {new Date().getFullYear()} 22 Electronic. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <a
              href={TIENDA_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              <span className="sr-only">Instagram</span>
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href={TIENDA_TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              <span className="sr-only">TikTok</span>
              <Music2 className="h-5 w-5" />
            </a>
            <a
              href={TIENDA_SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              <span className="sr-only">WhatsApp</span>
              <MessageCircle className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
