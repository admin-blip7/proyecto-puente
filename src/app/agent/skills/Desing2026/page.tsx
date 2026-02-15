"use client"

export default function Desing2026Page() {

  function copyToClipboard(token: string) {
    navigator.clipboard.writeText(token);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  }

  function playAnim(id: string, transition: string) {
    const el = document.getElementById(id);
    if (el) {
      el.style.transform = 'scale(0.8)';
      setTimeout(() => {
        el.style.transition = transition;
        el.style.transform = 'scale(1)';
      }, 50);
    }
  }

  return (
    <>
      <style>{`
        /* 
         * ONYX DESIGN SYSTEM - CORE VARIABLES 
         * Based on Research: IBM Carbon, Shopify Polaris, Apple HIG
         */
        :root {
            /* --- COLOR TOKENS (LCH Space for Perceptual Uniformity) --- */
            --color-surface-base: #0a0a0a;
            --color-surface-layer: #161616;
            --color-surface-card: #1f1f1f;
            --color-surface-highlight: #2a2a2a;
            
            --color-text-primary: #ffffff;
            --color-text-secondary: #a1a1a1;
            --color-text-tertiary: #6f6f6f;

            /* Brand Accent - Electric Blue */
            --color-brand-primary: #0F62FE; 
            --color-brand-hover: #0353E9;
            --color-brand-subtle: rgba(15, 98, 254, 0.1);

            /* Semantic Colors */
            --color-success: #42be65;
            --color-warning: #f1c21b;
            --color-error: #fa4d56;

            /* --- TYPOGRAPHY (Fluid Scale) --- */
            /* Using clamp() for responsive scaling without breakpoints */
            --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --font-family-mono: 'IBM Plex Mono', 'Fira Code', Consolas, monospace;

            --type-scale-ratio: 1.25; /* Major Third */
            --text-xs: clamp(0.75rem, 0.70rem + 0.25vw, 0.875rem);
            --text-sm: clamp(0.875rem, 0.83rem + 0.22vw, 1rem);
            --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
            --text-lg: clamp(1.25rem, 1.18rem + 0.35vw, 1.5rem);
            --text-xl: clamp(1.56rem, 1.45rem + 0.55vw, 2rem);
            --text-2xl: clamp(1.95rem, 1.75rem + 1vw, 2.75rem);
            --text-3xl: clamp(2.44rem, 2.15rem + 1.45vw, 3.5rem);

            /* --- SPACING (8pt Grid) --- */
            --space-1: 4px;
            --space-2: 8px;
            --space-3: 16px;
            --space-4: 24px;
            --space-6: 32px;
            --space-8: 48px;
            --space-12: 64px;
            --space-16: 96px;

            /* --- MOTION PHYSICS (IBM Carbon Inspired) --- */
            --ease-standard: cubic-bezier(0.2, 0, 0.38, 0.9);
            --ease-entrance: cubic-bezier(0, 0, 0.38, 0.9);
            --ease-exit: cubic-bezier(0.2, 0, 1, 0.9);
            
            --duration-fast: 110ms;
            --duration-moderate: 240ms;
            --duration-slow: 400ms;
        }

        /* RESET & BASE STYLES */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            background-color: var(--color-surface-base);
            color: var(--color-text-primary);
            font-family: var(--font-family-sans);
            font-size: var(--text-base);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        h1, h2, h3, h4 { font-weight: 600; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: var(--space-4); }
        h1 { font-size: var(--text-3xl); }
        h2 { font-size: var(--text-2xl); margin-top: var(--space-12); border-bottom: 1px solid var(--color-surface-highlight); padding-bottom: var(--space-2); }
        h3 { font-size: var(--text-xl); margin-top: var(--space-8); color: var(--color-text-primary); }
        p { margin-bottom: var(--space-4); max-width: 65ch; color: var(--color-text-secondary); }
        code { font-family: var(--font-family-mono); background: var(--color-surface-highlight); padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; color: var(--color-warning); }

        /* --- LAYOUT ARCHITECTURE --- */
        .app-container {
            display: grid;
            grid-template-columns: 280px 1fr;
            min-height: 100vh;
        }

        /* SIDEBAR NAVIGATION */
        .sidebar {
            background: var(--color-surface-layer);
            border-right: 1px solid var(--color-surface-highlight);
            padding: var(--space-6);
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        .brand-logo {
            font-size: var(--text-xl);
            font-weight: 800;
            margin-bottom: var(--space-8);
            letter-spacing: -0.05em;
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }
        
        .brand-logo span { color: var(--color-brand-primary); }

        .nav-group { margin-bottom: var(--space-6); }
        .nav-label {
            font-size: var(--text-xs);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--color-text-tertiary);
            margin-bottom: var(--space-3);
            font-weight: 700;
        }

        .nav-link {
            display: block;
            color: var(--color-text-secondary);
            text-decoration: none;
            padding: var(--space-2) 0;
            transition: all var(--duration-fast) var(--ease-standard);
            font-size: var(--text-sm);
            border-left: 2px solid transparent;
            padding-left: var(--space-3);
            margin-left: calc(var(--space-3) * -1);
        }

        .nav-link:hover,.nav-link.active {
            color: var(--color-text-primary);
            border-left-color: var(--color-brand-primary);
            background: linear-gradient(90deg, var(--color-surface-highlight) 0%, transparent 100%);
        }

        /* MAIN CONTENT AREA */
        .main-content {
            padding: var(--space-8) var(--space-12);
            max-width: 1400px;
        }

        /* HERO SECTION - BENTO GRID */
        .hero-bento {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(2, 300px);
            gap: var(--space-4);
            margin-bottom: var(--space-16);
        }

        .bento-card {
            background: var(--color-surface-card);
            border-radius: 16px;
            padding: var(--space-6);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform var(--duration-moderate) var(--ease-standard);
            border: 1px solid var(--color-surface-highlight);
            position: relative;
            overflow: hidden;
        }

        .bento-card:hover { transform: translateY(-4px); border-color: var(--color-brand-primary); }
        .bento-large { grid-column: span 2; grid-row: span 2; background: linear-gradient(135deg, var(--color-surface-card) 0%, #0f1525 100%); }
        .bento-wide { grid-column: span 2; }
        .bento-tall { grid-row: span 2; }

        .bento-title { font-size: var(--text-xl); font-weight: 700; color: var(--color-text-primary); }
        .bento-desc { font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--space-2); }

        /* --- COMPONENTS --- */

        /* Color Swatches */
        .color-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: var(--space-4);
            margin: var(--space-4) 0;
        }
        
        .swatch {
            background: var(--color-surface-card);
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--color-surface-highlight);
            cursor: pointer;
        }

        .swatch-color { height: 100px; width: 100%; transition: opacity 0.2s; }
        .swatch-color:hover { opacity: 0.9; }
        .swatch-info { padding: var(--space-3); }
        .swatch-name { font-weight: 700; display: block; font-size: var(--text-sm); }
        .swatch-hex { font-family: var(--font-family-mono); font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .swatch-token { font-family: var(--font-family-mono); font-size: var(--text-xs); color: var(--color-brand-primary); margin-top: 4px; display: block;}

        /* Typography Preview */
        .type-preview { border-left: 4px solid var(--color-surface-highlight); padding-left: var(--space-4); margin: var(--space-6) 0; }
        .type-meta { font-family: var(--font-family-mono); font-size: var(--text-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-1); display: block; }

        /* Motion Demo */
        .motion-stage {
            background: var(--color-surface-card);
            border: 1px solid var(--color-surface-highlight);
            border-radius: 8px;
            padding: var(--space-8);
            display: flex;
            align-items: center;
            justify-content: space-around;
            margin: var(--space-4) 0;
        }

        .motion-object {
            width: 64px;
            height: 64px;
            background: var(--color-brand-primary);
            border-radius: 8px;
            cursor: pointer;
        }

        /* Accessibility Badge */
        .a11y-badge {
            display: inline-flex;
            align-items: center;
            background: rgba(66, 190, 101, 0.1);
            color: var(--color-success);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: var(--text-xs);
            font-weight: 600;
            margin-left: var(--space-2);
        }

        /* DOs and DON'Ts */
        .comparison-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-4);
            margin: var(--space-4) 0;
        }
        .do-card,.dont-card {
            border-radius: 8px;
            overflow: hidden;
            border-top: 4px solid;
            background: var(--color-surface-card);
        }
        .do-card { border-color: var(--color-success); }
        .dont-card { border-color: var(--color-error); }
        .card-header { padding: var(--space-2) var(--space-4); font-weight: 700; font-size: var(--text-sm); text-transform: uppercase; }
        .do-card.card-header { color: var(--color-success); background: rgba(66, 190, 101, 0.05); }
        .dont-card.card-header { color: var(--color-error); background: rgba(250, 77, 86, 0.05); }
        .card-body { padding: var(--space-4); }

        /* FOOTER */
        footer { margin-top: var(--space-16); padding-top: var(--space-8); border-top: 1px solid var(--color-surface-highlight); color: var(--color-text-tertiary); font-size: var(--text-sm); }

        /* UTILS */
        .hidden { display: none; }
        .toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: var(--color-text-primary);
            color: var(--color-surface-base);
            padding: 12px 24px;
            border-radius: 4px;
            font-weight: 600;
            transform: translateY(100px);
            transition: transform 0.3s var(--ease-standard);
        }
        .toast.show { transform: translateY(0); }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
            .app-container { grid-template-columns: 1fr; }
            .sidebar { display: none; }
            .hero-bento { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
            .bento-large { grid-column: span 2; }
        }
        @media (max-width: 768px) {
            .hero-bento { display: flex; flex-direction: column; }
            .comparison-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="app-container">
        <aside className="sidebar">
          <div className="brand-logo">
            <div style={{width: '24px', height: '24px', background: 'var(--color-brand-primary)', borderRadius: '4px', marginRight: '8px'}}></div>
            ONYX <span>.SYS</span>
          </div>

          <div className="nav-group">
            <div className="nav-label">Fundamentos</div>
            <a href="#intro" className="nav-link active">Manifiesto & Visión</a>
            <a href="#logo" className="nav-link">Logotipo & Geometría</a>
            <a href="#color" className="nav-link">Color Semántico</a>
            <a href="#type" className="nav-link">Tipografía Fluida</a>
          </div>

          <div className="nav-group">
            <div className="nav-label">Sistema UI</div>
            <a href="#grid" className="nav-link">Retícula de 8pt</a>
            <a href="#icons" className="nav-link">Iconografía (24px)</a>
            <a href="#motion" className="nav-link">Física del Movimiento</a>
            <a href="#sound" className="nav-link">Identidad Sonora</a>
          </div>

          <div className="nav-group">
            <div className="nav-label">Gobernanza</div>
            <a href="#genai" className="nav-link">Política GenAI <span className="a11y-badge" style={{fontSize: '9px', padding: '2px 4px'}}>NEW</span></a>
            <a href="#eco" className="nav-link">Eco-Design Standards</a>
            <a href="#a11y" className="nav-link">Accesibilidad AAA</a>
          </div>
        </aside>

        <main className="main-content">
          <section id="intro">
            <h1>Arquitectura Maestra de Identidad</h1>
            <p>Este no es un manual estático. Es la fuente única de verdad (SSOT) para el ecosistema ONYX. Diseñado para escalar desde un smartwatch hasta un entorno de realidad espacial.</p>
            
            <div className="hero-bento">
              <div className="bento-card bento-large">
                <div>
                  <div className="a11y-badge" style={{marginBottom: 'var(--space-2)', marginLeft: 0}}>v5.0 Stable</div>
                  <div className="bento-title">El Sistema Atómico</div>
                  <p style={{marginTop: '8px', opacity: 0.8}}>Un enfoque modular basado en tokens de diseño que garantiza consistencia en iOS, Web y Android.</p>
                </div>
                <div style={{marginTop: '24px'}}>
                  <code style={{background: 'rgba(255,255,255,0.1)', color: 'white'}}>npm install @onyx/core</code>
                </div>
              </div>
              <div className="bento-card">
                <div className="bento-title">Accesibilidad 1º</div>
                <div className="bento-desc">Cumplimiento WCAG 2.2 AAA por defecto en cada componente.</div>
                <div style={{fontSize: '3rem', color: 'var(--color-success)', marginTop: 'auto'}}>Aa</div>
              </div>
              <div className="bento-card">
                <div className="bento-title">Motion Physics</div>
                <div className="bento-desc">Animaciones calculadas con masa y fricción, no lineales.</div>
                <div style={{marginTop: 'auto', height: '4px', background: 'var(--color-surface-highlight)', borderRadius: '2px', overflow: 'hidden'}}>
                  <div style={{width: '50%', height: '100%', background: 'var(--color-brand-primary)', animation: 'loading 2s infinite var(--ease-standard)'}}></div>
                </div>
              </div>
              <div className="bento-card bento-wide">
                <div className="bento-title">GenAI Governance</div>
                <div className="bento-desc">Protocolos éticos para la generación de contenido sintético y asistentes de marca.</div>
              </div>
            </div>
          </section>

          <section id="color">
            <h2>Sistema de Color Semántico</h2>
            <p>No usamos colores hexadecimales crudos ({"'"}hardcoded{"'"}). Usamos <strong>Tokens de Propósito</strong>. Esto permite cambiar el tema (Modo Oscuro/Claro/Alto Contraste) sin tocar una línea de código HTML.</p>

            <h3>Colores de Acción (Interactive)</h3>
            <div className="color-grid">
              <div className="swatch" onClick={() => copyToClipboard('--color-brand-primary')}>
                <div className="swatch-color" style={{background: 'var(--color-brand-primary)'}}></div>
                <div className="swatch-info">
                  <span className="swatch-name">Primary Action</span>
                  <span className="swatch-hex">#0F62FE</span>
                  <code className="swatch-token">$action-primary</code>
                </div>
              </div>
              <div className="swatch" onClick={() => copyToClipboard('--color-brand-hover')}>
                <div className="swatch-color" style={{background: 'var(--color-brand-hover)'}}></div>
                <div className="swatch-info">
                  <span className="swatch-name">Primary Hover</span>
                  <span className="swatch-hex">#0353E9</span>
                  <code className="swatch-token">$action-hover</code>
                </div>
              </div>
            </div>

            <h3>Estados Funcionales (Feedback)</h3>
            <div className="color-grid">
              <div className="swatch" onClick={() => copyToClipboard('--color-success')}>
                <div className="swatch-color" style={{background: 'var(--color-success)'}}></div>
                <div className="swatch-info">
                  <span className="swatch-name">Success</span>
                  <span className="swatch-hex">#42BE65</span>
                  <code className="swatch-token">$support-success</code>
                </div>
              </div>
              <div className="swatch" onClick={() => copyToClipboard('--color-warning')}>
                <div className="swatch-color" style={{background: 'var(--color-warning)'}}></div>
                <div className="swatch-info">
                  <span className="swatch-name">Warning</span>
                  <span className="swatch-hex">#F1C21B</span>
                  <code className="swatch-token">$support-warning</code>
                </div>
              </div>
              <div className="swatch" onClick={() => copyToClipboard('--color-error')}>
                <div className="swatch-color" style={{background: 'var(--color-error)'}}></div>
                <div className="swatch-info">
                  <span className="swatch-name">Error / Danger</span>
                  <span className="swatch-hex">#FA4D56</span>
                  <code className="swatch-token">$support-error</code>
                </div>
              </div>
            </div>
          </section>

          <section id="type">
            <h2>Tipografía Fluida</h2>
            <p>El tamaño de fuente se calcula matemáticamente según el ancho del viewport (pantalla) usando la función CSS <code>clamp()</code>. No hay {"'"}saltos{"'"} bruscos entre móvil y escritorio.</p>
            
            <div className="type-preview">
              <span className="type-meta">$heading-01 | clamp(2.44rem, 2.15rem + 1.45vw, 3.5rem)</span>
              <h1>Diseño sin fronteras.</h1>
            </div>
            <div className="type-preview">
              <span className="type-meta">$heading-02 | clamp(1.95rem, 1.75rem + 1vw, 2.75rem)</span>
              <h2>La ingeniería de la belleza.</h2>
            </div>
            <div className="type-preview">
              <span className="type-meta">$body-01 | clamp(1rem, 0.95rem + 0.25vw, 1.125rem)</span>
              <p>El texto de cuerpo está optimizado para lectura prolongada. El alto de línea (line-height) siempre es 1.5x o 1.6x el tamaño de la fuente para cumplir con los estándares de accesibilidad cognitiva WCAG.</p>
            </div>
          </section>

          <section id="motion">
            <h2>Física del Movimiento</h2>
            <p>La interfaz no {"'"}parpadea{"'"}. Se mueve con masa y propósito. Usamos curvas Bézier personalizadas.</p>

            <div className="comparison-grid">
              <div className="do-card">
                <div className="card-header">Standard Easing (Productive)</div>
                <div className="card-body">
                  <p style={{fontSize: '0.9em', marginBottom: '16px'}}>Para elementos UI como menús y listas. Rápido y eficiente.</p>
                  <div className="motion-stage">
                    <div id="anim-productive" className="motion-object"></div>
                  </div>
                  <button onClick={() => playAnim('anim-productive', 'transform 0.2s cubic-bezier(0.2, 0, 0.38, 0.9)')} style={{background: 'transparent', border: '1px solid white', color: 'white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'}}>Play</button>
                </div>
              </div>
              <div className="do-card" style={{borderColor: 'var(--color-brand-primary)'}}>
                <div className="card-header" style={{color: 'var(--color-brand-primary)', background: 'rgba(15, 98, 254, 0.1)'}}>Expressive Easing</div>
                <div className="card-body">
                  <p style={{fontSize: '0.9em', marginBottom: '16px'}}>Para momentos importantes (modales, alertas). Más dramático.</p>
                  <div className="motion-stage">
                    <div id="anim-expressive" className="motion-object"></div>
                  </div>
                  <button onClick={() => playAnim('anim-expressive', 'transform 0.4s cubic-bezier(0.4, 0.14, 0.3, 1)')} style={{background: 'transparent', border: '1px solid white', color: 'white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'}}>Play</button>
                </div>
              </div>
            </div>
          </section>

          <section id="genai">
            <h2>Gobernanza de Inteligencia Artificial <span className="a11y-badge">CRÍTICO 2026</span></h2>
            <p>Normativas para el uso de modelos LLM y Generación de Imagen en activos de marca.</p>

            <div className="comparison-grid">
              <div className="do-card">
                <div className="card-header">DO: Asistencia y Estructura</div>
                <div className="card-body">
                  <ul style={{paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--color-text-secondary)'}}>
                    <li>Usar IA para generar bocetos (wireframes) y moodboards.</li>
                    <li>Utilizar LLMs para corrección gramatical y traducción (i18n).</li>
                    <li>Etiquetar internamente cualquier activo sintético con metadatos <code>CreatedWith: AI</code>.</li>
                  </ul>
                </div>
              </div>
              <div className="dont-card">
                <div className="card-header">DON'T: Generación Final sin Supervisión</div>
                <div className="card-body">
                  <ul style={{paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--color-text-secondary)'}}>
                    <li>Nunca usar rostros humanos generados por IA en fotografía de producto (evitar {"'"}Uncanny Valley{"'"}).</li>
                    <li>No subir propiedad intelectual confidencial a modelos públicos (ChatGPT/Midjourney).</li>
                    <li>Prohibido generar copy final sin revisión humana de Tono y Voz.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <footer>
            <p>ONYX Design System v5.0 | © 2026 Global Brand Corp. | <a href="#" style={{color: 'white'}}>Repositorio Git</a> | <a href="#" style={{color: 'white'}}>Reportar Bug</a></p>
          </footer>
        </main>
      </div>

      <div id="toast" className="toast">¡Token copiado al portapapeles!</div>
    </>
  )
}
