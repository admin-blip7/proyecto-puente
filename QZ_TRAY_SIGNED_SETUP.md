# Configuracion de QZ Tray con Firma (menos avisos y cercano a modo silencioso)

Este proyecto ya incluye endpoints para firma:
- `GET /api/qz/certificate`
- `POST /api/qz/sign`

QZ Tray usa estos endpoints para firmar solicitudes y reducir advertencias de seguridad.

## 1) Generar certificado y llave (prueba/local)

> Para produccion se recomienda certificado valido para QZ.

```bash
openssl req -x509 -newkey rsa:2048 -sha256 -nodes \
  -keyout qz-private-key.pem \
  -out qz-certificate.pem \
  -days 365 \
  -subj "/CN=TuNegocioQZ"
```

## 2) Configurar variables de entorno

Agrega en tu `.env.local`:

```env
QZ_CERT_PEM="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
QZ_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# Opcional si tu llave tiene passphrase
QZ_PRIVATE_KEY_PASSPHRASE=""
```

Notas:
- Puedes pegar PEM multilinea real o con `\\n` escapado.
- Nunca expongas la llave privada al cliente.

## 3) Reiniciar la app

```bash
npm run dev
```

## 4) Configurar desde UI

1. Abre `Configuracion > Impresoras` (`/admin/settings?tab=printers`).
2. Conecta QZ Tray.
3. Busca impresoras.
4. Asigna impresora de tickets y de etiquetas.
5. Activa `Usar QZ Tray para impresion automatica`.
6. Guarda.

## 5) En QZ Tray (primera vez)

Cuando aparezcan permisos:
- Permite el sitio.
- Marca opcion equivalente a "recordar decision" para evitar prompts futuros.

Con firma + permiso recordado, la experiencia queda practicamente silenciosa.

## 6) Verificacion rapida

- Imprime un ticket: debe ir a la impresora de tickets.
- Imprime etiquetas: debe ir a la impresora de etiquetas.
- Si QZ no esta disponible, el sistema hace fallback al dialogo del navegador.
