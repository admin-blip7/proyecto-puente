# Solución de Problemas de Fast Refresh en Next.js con Turbopack

## Problemas Comunes y Soluciones

### 1. Errores de Fast Refresh y HMR

**Síntomas:**
- `[Fast Refresh] rebuilding` mensajes repetidos
- `[Fast Refresh] done in XXXms` con tiempos altos
- `react-server-dom-turbopack-client.browser.development.js` errores
- `Error saving client` con código de error

**Causas:**
- Cache de desarrollo corrupta
- Conflictos en la resolución de módulos
- Problemas con la configuración de Turbopack
- Errores en el código que afectan la reconciliación de React

### 2. Soluciones Implementadas

#### A. Script de Limpieza de Cache (`scripts/clear-cache.js`)

```bash
# Limpiar cache manualmente
npm run clean:cache

# O usar el comando directamente
node scripts/clear-cache.js
```

#### B. Comandos de Desarrollo Mejorados

```bash
# Desarrollo con cache deshabilitado (más estable)
npm run dev:stable

# Desarrollo con limpieza de cache previa
npm run dev:clean
```

#### C. Manejador de Errores de Fast Refresh

Se ha implementado un componente que intercepta y maneja errores de Fast Refresh:

```tsx
// En tu archivo principal (app/layout.tsx o pages/_app.tsx)
import { FastRefreshErrorHandler } from '@/components/shared/FastRefreshErrorHandler';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <FastRefreshErrorHandler>
          {children}
        </FastRefreshErrorHandler>
      </body>
    </html>
  );
}
```

### 3. Pasos para Resolver Problemas

#### Paso 1: Limpiar Cache
```bash
npm run clean:cache
```

#### Paso 2: Reiniciar Servidor
```bash
# Si hay problemas de puerto
lsof -ti:9003 | xargs kill -9
npm run dev
```

#### Paso 3: Usar Modo Estable
```bash
npm run dev:stable
```

#### Paso 4: Verificar Configuración
- Asegúrate que `next.config.ts` no tenga configuraciones inválidas
- Verifica que las dependencias estén actualizadas

### 4. Prevención

#### A. Uso de TypeScript
- Habilita `ignoreBuildErrors: true` en desarrollo
- Usa tipos estrictos para evitar errores en tiempo de ejecución

#### B. Optimización de Imports
- Evita imports circulares
- Usa `dynamic imports` para componentes pesados
- Mantén los archivos de componentes pequeños y enfocados

#### C. Manejo de Estado
- Usa `useEffect` cuidadosamente para evitar ciclos de renderizado
- Implementa `React.memo` para componentes que no cambian frecuentemente

### 5. Monitoreo

El manejador de errores incluye:

- **Detección de errores**: Intercepta errores de `react-server-dom-turbopack`
- **Conteo de intentos**: Monitorea la frecuencia de errores
- **Notificaciones**: Muestra mensajes amigables en desarrollo
- **Recuperación automática**: Intenta recuperarse después de 2 segundos

### 6. Comandos Útiles

```bash
# Verificar estado del proyecto
npm run typecheck
npm run lint

# Reconstruir completamente
npm run clean && npm install && npm run dev

# Ver logs detallados
npm run dev -- --verbose
```

### 7. Cuando Contactar Soporte

Si persisten los problemas después de:

1. ✅ Limpiar cache completamente
2. ✅ Verificar configuración de Next.js
3. ✅ Actualizar dependencias
4. ✅ Usar modo estable de desarrollo

Considera:
- Revisar la versión de Node.js (debe ser >= 18.0.0)
- Verificar espacio en disco
- Reinstalar node_modules: `rm -rf node_modules && npm install`

---

**Nota:** Los errores de Fast Refresh son comunes en proyectos grandes con Turbopack. La combinación de estas soluciones debería reducir significativamente la frecuencia de estos problemas.