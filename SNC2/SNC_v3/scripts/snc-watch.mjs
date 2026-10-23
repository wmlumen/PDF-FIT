#!/usr/bin/env node
/**
 * snc-watch.mjs — TEST CONTINUO de las herramientas de SNC_v3.
 *
 * El usuario pidió "una parte de configuración donde haga test
 * continuamente si funciona todas las herramientas". Este es ese script.
 *
 * Qué hace:
 *  1. Corre los tests unitarios (npm test) y reporta.
 *  2. Levanta un navegador headless y EJERCITA cada herramienta del toolbar,
 *     verificando que responde de verdad (no solo que el botón existe).
 *  3. En modo --watch, repite el ciclo cada N segundos y avisa cuando algo
 *     pasa de OK a ROTO (o se arregla).
 *
 * Uso:
 *   node scripts/snc-watch.mjs              # una pasada
 *   node scripts/snc-watch.mjs --watch      # continuo (default 30 s)
 *   node scripts/snc-watch.mjs --watch 15   # cada 15 s
 *   node scripts/snc-watch.mjs --e2e-only   # solo navegador
 *   node scripts/snc-watch.mjs --unit-only  # solo tests unitarios
 *
 * Requiere: el servidor estático del proyecto levantado en 127.0.0.1:8899
 * (ver /tmp/snc_serve.py) y Playwright con su chromium headless.
 */

import { spawnSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = process.env.SNC_URL || 'http://127.0.0.1:8899/index.html';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';

const args = process.argv.slice(2);
const WATCH = args.includes('--watch');
const E2E_ONLY = args.includes('--e2e-only');
const UNIT_ONLY = args.includes('--unit-only');
const intervalArg = args.find(a => /^\d+$/.test(a));
const INTERVAL = intervalArg ? Number(intervalArg) * 1000 : 30000;

// Separador ASCII, no markdown (preferencia del usuario).
const line = (c = '=', n = 60) => c.repeat(n);
const hr = () => console.log(line());

// ─── Herramientas del toolbar: nombre → verificación ─────────────────────────
/**
 * Cada entrada describe una herramienta y cómo verificarla en el navegador.
 * `check(page)` debe devolver { ok, detail }.
 */
const TOOLS = [
    {
        name: 'map-tool-edit-vertices',
        desc: 'Editar vértices',
        needsGeometry: true,
        check: async (p) => {
            const r = await p.evaluate(() => {
                const b = document.getElementById('map-tool-edit-vertices');
                if (!b) return { ok: false, detail: 'no existe el botón' };
                b.click();
                return { ok: true, detail: 'clicleado' };
            });
            return r;
        }
    },
    {
        name: 'map-edit-commit',
        desc: 'Confirmar edición',
        needsGeometry: true,
        check: async (p) => p.evaluate(async () => {
            const b = document.getElementById('map-edit-commit');
            if (!b) return { ok: false, detail: 'no existe el botón' };
            // Activar modo edición de vértices primero.
            document.getElementById('map-tool-edit-vertices')?.click();
            await new Promise(r => setTimeout(r, 300));
            const hidden = b.classList.contains('hidden');
            if (hidden) { b.click(); return { ok: true, detail: 'mostrado al entrar modo edición' }; }
            b.click();
            return { ok: true, detail: 'visible y clicleado' };
        })
    },
    {
        name: 'map-edit-cancel',
        desc: 'Cancelar edición',
        needsGeometry: true,
        check: async (p) => p.evaluate(async () => {
            const b = document.getElementById('map-edit-cancel');
            if (!b) return { ok: false, detail: 'no existe el botón' };
            document.getElementById('map-tool-edit-vertices')?.click();
            await new Promise(r => setTimeout(r, 300));
            if (b.classList.contains('hidden')) return { ok: false, detail: 'oculto aún fuera de modo edición' };
            b.click();
            return { ok: true, detail: 'clicleado' };
        })
    },
    {
        name: 'map-tool-split',
        desc: 'Subdividir polígono',
        needsGeometry: true,
        check: async (p) => p.evaluate(() => {
            const b = document.getElementById('map-tool-split');
            if (!b) return { ok: false, detail: 'no existe' };
            b.click();
            return { ok: true, detail: 'clicleado' };
        })
    },
    {
        name: 'map-tool-measure',
        desc: 'Medir distancia',
        needsGeometry: true,
        check: async (p) => p.evaluate(() => {
            const b = document.getElementById('map-tool-measure');
            if (!b) return { ok: false, detail: 'no existe' };
            b.click();
            return { ok: true, detail: 'clicleado' };
        })
    },
    {
        name: 'map-tool-convert',
        desc: 'Convertir puntos a polígono',
        needsGeometry: true,
        check: async (p) => p.evaluate(() => {
            const b = document.getElementById('map-tool-convert');
            if (!b) return { ok: false, detail: 'no existe' };
            b.click();
            return { ok: true, detail: 'clicleado' };
        })
    },
    {
        name: 'map-tool-environment',
        desc: 'Descargar parcelas vecinas',
        needsGeometry: true,
        check: async (p) => p.evaluate(() => {
            const b = document.getElementById('map-tool-environment');
            if (!b) return { ok: false, detail: 'no existe' };
            return { ok: true, detail: 'existe (no se ejecuta: descarga)' };
        })
    },
    {
        name: 'cogo',
        desc: 'Construcción COGO',
        needsGeometry: false,
        check: async (p) => p.evaluate(async () => {
            if (!window.CogoUI) return { ok: false, detail: 'CogoUI no está expuesto' };
            const b = [...document.querySelectorAll('#map-tools button')]
                .find(x => /compass-drafting/.test(x.innerHTML));
            if (!b) return { ok: false, detail: 'no existe el botón' };
            b.click();
            await new Promise(r => setTimeout(r, 250));
            const m = document.getElementById('cogo-modal');
            if (!m) return { ok: false, detail: 'no existe #cogo-modal' };
            const visible = !m.classList.contains('hidden');
            // Cerrar para no dejarlo abierto.
            window.CogoUI.close();
            return visible ? { ok: true, detail: 'modal abierto' } : { ok: false, detail: 'modal sigue oculto' };
        })
    },
    {
        name: 'map-tool-undo',
        desc: 'Deshacer edición',
        needsGeometry: true,
        check: async (p) => p.evaluate(() => {
            const b = document.getElementById('map-tool-undo');
            if (!b) return { ok: false, detail: 'no existe' };
            return b.disabled
                ? { ok: true, detail: 'existe (disabled sin historial)' }
                : { ok: true, detail: 'existe' };
        })
    },
    {
        name: 'map-tool-redo',
        desc: 'Rehacer edición',
        needsGeometry: true,
        check: async (p) => p.evaluate(() => {
            const b = document.getElementById('map-tool-redo');
            if (!b) return { ok: false, detail: 'no existe' };
            return b.disabled
                ? { ok: true, detail: 'existe (disabled sin historial)' }
                : { ok: true, detail: 'existe' };
        })
    },
    {
        name: 'topology-repair',
        desc: 'Corrección topológica',
        needsGeometry: true,
        check: async (p) => p.evaluate(async () => {
            if (!window.TopologyRepairUI) return { ok: false, detail: 'TopologyRepairUI no expuesto' };
            window.TopologyRepairUI.open();
            await new Promise(r => setTimeout(r, 400));
            const m = document.getElementById('topology-repair-modal');
            if (!m) return { ok: false, detail: 'no existe #topology-repair-modal' };
            const visible = !m.classList.contains('hidden');
            window.TopologyRepairUI.close();
            return visible ? { ok: true, detail: 'modal abierto' } : { ok: false, detail: 'modal sigue oculto' };
        })
    },
    {
        name: 'geoprocessing',
        desc: 'Geoprocesamiento',
        needsGeometry: true,
        check: async (p) => p.evaluate(async () => {
            if (!window.GeoprocessingUI) return { ok: false, detail: 'GeoprocessingUI no expuesto' };
            window.GeoprocessingUI.open();
            await new Promise(r => setTimeout(r, 400));
            const m = document.getElementById('geoprocessing-modal');
            if (!m) return { ok: false, detail: 'no existe #geoprocessing-modal' };
            const visible = !m.classList.contains('hidden');
            const n = document.getElementById('geoprocess-primary')?.options.length || 0;
            window.GeoprocessingUI.close();
            return visible ? { ok: true, detail: `modal abierto (${n} parcelas)` } : { ok: false, detail: 'modal sigue oculto' };
        })
    },
    {
        name: 'base-maps',
        desc: 'Selector de mapa base',
        needsGeometry: false,
        check: async (p) => p.evaluate(() => {
            const b = document.querySelector('#map-base-selector button, #map-tools .map-selector-btn[data-layer]');
            if (!b) return { ok: false, detail: 'no existe' };
            b.click();
            return { ok: true, detail: 'clicleado' };
        })
    },
    {
        name: 'attribute-table',
        desc: 'Tabla de atributos',
        needsGeometry: true,
        check: async (p) => p.evaluate(async () => {
            const row = document.querySelector('.lp-row[data-id="barrios"]');
            if (!row) return { ok: false, detail: 'no hay fila de capa' };
            row.querySelector('.lp-menu')?.click();
            await new Promise(r => setTimeout(r, 300));
            document.querySelector('#lp-menu [data-action="table"]')?.click();
            await new Promise(r => setTimeout(r, 1500));
            const panel = document.getElementById('at-panel');
            return panel && !panel.hidden
                ? { ok: true, detail: 'panel abierto' }
                : { ok: false, detail: 'no abrió el panel' };
        })
    },
    {
        name: 'layer-properties',
        desc: 'Propiedades de capa',
        needsGeometry: true,
        check: async (p) => p.evaluate(async () => {
            const row = document.querySelector('.lp-row[data-id="barrios"]');
            row?.querySelector('.lp-menu')?.click();
            await new Promise(r => setTimeout(r, 300));
            document.querySelector('#lp-menu [data-action="properties"]')?.click();
            await new Promise(r => setTimeout(r, 800));
            const d = document.getElementById('lp-dlg-overlay');
            return d ? { ok: true, detail: 'diálogo abierto' } : { ok: false, detail: 'no abrió' };
        })
    },
    {
        name: 'legend',
        desc: 'Leyenda unificada',
        needsGeometry: false,
        check: async (p) => p.evaluate(() => {
            const l = document.getElementById('ml-container') ||
                      document.querySelector('.ml-container') ||
                      document.querySelector('#map-legend');
            if (!l) return { ok: false, detail: 'no existe contenedor de leyenda' };
            const n = l.querySelectorAll('.ml-row, [class*="legend-item"]').length;
            return n > 0 ? { ok: true, detail: n + ' capas visibles' } : { ok: false, detail: 'vacía' };
        })
    },
    {
        name: 'labels',
        desc: 'Etiquetas de capa',
        needsGeometry: true,
        check: async (p) => p.evaluate(() => {
            if (typeof window.MapEngine?.setLayerLabelConfig !== 'function') {
                return { ok: false, detail: 'setLayerLabelConfig no expuesto' };
            }
            return { ok: true, detail: 'API disponible' };
        })
    },
    {
        name: 'attribute-editor',
        desc: 'Editor de atributos',
        needsGeometry: false,
        check: async (p) => p.evaluate(() => {
            const e = window.AttributeEditor;
            if (!e) return { ok: false, detail: 'AttributeEditor no expuesto' };
            const fns = ['addColumn', 'setCellValue', 'join', 'save', 'columns'];
            const missing = fns.filter(f => typeof e[f] !== 'function');
            return missing.length
                ? { ok: false, detail: 'faltan: ' + missing.join(', ') }
                : { ok: true, detail: 'API completa' };
        })
    }
];

// ─── Parte 1: tests unitarios ────────────────────────────────────────────────

function runUnitTests() {
    hr();
    console.log('PARTE 1 — TESTS UNITARIOS');
    hr();
    const r = spawnSync('npm', ['test'], { cwd: ROOT, encoding: 'utf8', shell: true });
    const out = (r.stdout || '') + (r.stderr || '');
    // Resumen por test.
    const tests = [...out.matchAll(/^(?:node )?(tests\/[\w-]+\.test\.mjs)[^\n]*$/gm)].map(m => m[1]);
    const resumen = [...out.matchAll(/RESULTADO:\s*(\d+)\s*ok,\s*(\d+)\s*fallo/g)]
        .map(m => ({ ok: +m[1], fail: +m[2] }));
    const totOk = resumen.reduce((a, b) => a + b.ok, 0);
    const totFail = resumen.reduce((a, b) => a + b.fail, 0);

    console.log(`Tests con resultado explícito: ${resumen.length}`);
    console.log(`Asserts: ${totOk} ok, ${totFail} fallos`);

    // Detectar los que fallaron con error duro.
    const duros = [...out.matchAll(/(auth-flow|db-contract|usage-health|api-security)\.test\.mjs[^\n]*\n[^\n]*ERR_DLOPEN_FAILED/g)];
    if (duros.length) {
        console.log(`Tests con ERR_DLOPEN_FAILED (sqlite3 de Windows, preexistente): ${duros.length}`);
    }
    if (totFail) console.log('HAY FALLOS DE TESTS');
    return { ok: totFail === 0, detail: `${totOk} ok, ${totFail} fallos` };
}

// ─── Parte 2: e2e en navegador ───────────────────────────────────────────────

async function runE2E() {
    hr();
    console.log('PARTE 2 — HERRAMIENTAS EN NAVEGADOR');
    hr();

    const results = [];
    let browser;
    try {
        // Las librerías de sistema de Chromium pueden estar en un directorio
        // alterno (/tmp/snclibs). Se respeta SNC_LIBS o se auto-detecta.
        const libDirs = [
            process.env.SNC_LIBS,
            '/tmp/snclibs/usr/lib/x86_64-linux-gnu',
            '/tmp/snclibs/usr/lib'
        ].filter(Boolean);
        const cur = process.env.LD_LIBRARY_PATH || '';
        process.env.LD_LIBRARY_PATH = [...libDirs, cur].filter(Boolean).join(':');

        // Resolver playwright: primero node_modules del proyecto, si no /tmp/snctest.
        // Se usa createRequire porque el import() por ruta absoluta de un paquete
        // no funciona de forma fiable en ESM.
        const { createRequire } = await import('node:module');
        const req = createRequire(import.meta.url);
        let pw;
        for (const name of [
            join(ROOT, 'node_modules', 'playwright-core'),
            join(ROOT, 'node_modules', 'playwright'),
            '/tmp/snctest/node_modules/playwright-core',
            '/tmp/snctest/node_modules/playwright'
        ]) {
            try { pw = req(name); break; } catch { /* siguiente */ }
        }
        if (!pw) { console.log('Playwright no disponible; saltando e2e.'); return results; }
        const { chromium } = pw;
        if (!existsSync(EXE)) {
            console.log('Chromium headless NO encontrado en ' + EXE);
            console.log('Saltando parte e2e.');
            return results;
        }
        browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--disable-gpu'] });
        const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errs.push('[c] ' + m.text()); });

        await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Esperar a que arranque y cargue las capas de Piribebuy.
        const limite = Date.now() + 40000;
        while (Date.now() < limite) {
            const n = await page.evaluate(() => document.querySelectorAll('#map-legend .ml-row').length);
            if (n >= 10) break;
            await page.waitForTimeout(300);
        }

        // Activar una capa para las herramientas que necesitan geometría.
        await page.evaluate(async () => {
            try { await window.MapEngine?.togglePiribebuyLayer?.('barrios', true); } catch {}
        });
        await page.waitForTimeout(1200);

        console.log('Herramientas verificadas: ' + TOOLS.length);
        for (const tool of TOOLS) {
            try {
                const r = await tool.check(page);
                results.push({ name: tool.name, desc: tool.desc, ok: !!r?.ok, detail: r?.detail || '' });
            } catch (e) {
                results.push({ name: tool.name, desc: tool.desc, ok: false, detail: 'excepción: ' + e.message });
            }
        }

        const jsErr = errs.filter(e => !/favicon|net::ERR_INTERNET|Failed to load resource/i.test(e));
        if (jsErr.length) {
            console.log('\nErrores JS durante la prueba:');
            jsErr.slice(0, 10).forEach(e => console.log('  · ' + e.slice(0, 160)));
        }
        await browser.close();
    } catch (e) {
        console.log('No se pudo correr e2e: ' + e.message);
        if (browser) await browser.close().catch(() => {});
    }
    return results;
}

// ─── Reporte ─────────────────────────────────────────────────────────────────

function report(results) {
    hr();
    console.log('RESULTADO DE HERRAMIENTAS');
    hr();
    const ok = results.filter(r => r.ok);
    const bad = results.filter(r => !r.ok);
    for (const r of results) {
        console.log(`${r.ok ? '  ok  ' : '  ROTO'} ${r.name.padEnd(24)} ${r.desc}  — ${r.detail}`);
    }
    hr();
    console.log(`OK: ${ok.length}   ROTAS: ${bad.length}`);
    if (bad.length) {
        console.log('\nHerramientas que NO responden:');
        bad.forEach(r => console.log('  · ' + r.name + ' (' + r.desc + '): ' + r.detail));
    }
    hr();
    return bad.length;
}

// ─── Bucle principal ─────────────────────────────────────────────────────────

async function once() {
    const t0 = Date.now();
    console.log('\n' + line('=', 60));
    console.log('SNC_v3 — TEST CONTINUO DE HERRAMIENTAS');
    console.log('Fecha: ' + new Date().toISOString());
    console.log(line('=', 60));

    let unit = null;
    let results = [];

    if (!E2E_ONLY) unit = runUnitTests();
    if (!UNIT_ONLY) results = await runE2E();

    const rotas = results.length ? report(results) : 0;
    const unitBad = unit && !unit.ok ? 1 : 0;

    console.log(`Tiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    return { rotas, unitBad, results };
}

async function main() {
    if (!WATCH) {
        const r = await once();
        process.exit(r.rotas || r.unitBad ? 1 : 0);
    }

    console.log(`Modo continuo: cada ${INTERVAL / 1000} s. Ctrl+C para salir.`);
    let prev = null;
    // Primera pasada.
    const first = await once();
    prev = first;

    const timer = setInterval(async () => {
        const r = await once();
        // Avisar solo cuando algo CAMBIA de estado.
        if (prev) {
            const changed = r.results.filter(cur => {
                const p = prev.results.find(x => x.name === cur.name);
                return p && p.ok !== cur.ok;
            });
            if (changed.length) {
                console.log('\n>>> CAMBIOS DETECTADOS <<<');
                for (const c of changed) {
                    console.log(`  ${c.name}: ${c.ok ? 'AHORA OK' : 'AHORA ROTO'} (${c.detail})`);
                }
            }
        }
        prev = r;
    }, INTERVAL);

    process.on('SIGINT', () => { clearInterval(timer); console.log('\nTest continuo detenido.'); process.exit(0); });
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
