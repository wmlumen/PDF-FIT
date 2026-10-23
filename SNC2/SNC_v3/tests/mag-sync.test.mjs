/**
 * tests/mag-sync.test.mjs
 * Pruebas unitarias para el Sincronizador y Caché de Capas MAG (Ciclo de 15 días)
 */

import { test } from 'node:test';
import assert from 'node:assert';
import sqlite3 from 'sqlite3';
import {
    MAG_SYNC_INTERVAL_DAYS,
    MAG_SYNC_INTERVAL_MS,
    MAG_CATALOG_DEFS,
    isSyncExpired,
    calculateNextSync,
    getDaysUntilNextSync,
    MagSyncManager
} from '../magSync.js';

test('MAG Sync - Parámetros del ciclo oficial de actualización', () => {
    assert.strictEqual(MAG_SYNC_INTERVAL_DAYS, 15, 'El ciclo debe ser de exactamente 15 días');
    assert.strictEqual(MAG_SYNC_INTERVAL_MS, 15 * 24 * 60 * 60 * 1000, 'Milisegundos correctos para 15 días');
});

test('MAG Sync - Detección de vigencia y expiración de 15 días', () => {
    const now = Date.now();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000);

    assert.strictEqual(isSyncExpired(tenDaysAgo), false, '10 días no debe expirar (vigente)');
    assert.strictEqual(isSyncExpired(fifteenDaysAgo), true, '15 días exactos debe marcar expirado');
    assert.strictEqual(isSyncExpired(twentyDaysAgo), true, '20 días debe marcar expirado');
    assert.strictEqual(isSyncExpired(null), true, 'Sin fecha previa debe marcar expirado para primera sincronización');
});

test('MAG Sync - Cálculo de próxima sincronización y días restantes', () => {
    const baseDate = new Date('2026-10-01T12:00:00Z');
    const nextSync = calculateNextSync(baseDate);
    const expected = new Date('2026-10-16T12:00:00Z');

    assert.strictEqual(nextSync.toISOString(), expected.toISOString(), 'La próxima sincronización debe ser 15 días después');

    // Días restantes a partir de un target a 5 días
    const fiveDaysFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const remaining = getDaysUntilNextSync(fiveDaysFuture);
    assert.strictEqual(remaining, 5, 'Deben quedar 5 días restantes');
});

test('MAG Sync - Catálogo de capas agropecuarias estratégicas', () => {
    assert.ok(MAG_CATALOG_DEFS['uso_tierra'], 'Debe incluir uso de la tierra');
    assert.ok(MAG_CATALOG_DEFS['cultivos_temporales'], 'Debe incluir cultivos temporales (EUDR)');
    assert.ok(MAG_CATALOG_DEFS['cultivos_permanentes'], 'Debe incluir cultivos permanentes');
    assert.ok(MAG_CATALOG_DEFS['hidrografia_rural'], 'Debe incluir red hidrográfica rural');
    assert.ok(MAG_CATALOG_DEFS['pecuario_distrital'], 'Debe incluir actividad pecuaria');

    assert.ok(MAG_CATALOG_DEFS['cultivos_temporales'].strategicUse.includes('EUDR'));
});

test('MAG Sync - Persistencia SQLite con MagSyncManager', async () => {
    const memDb = new sqlite3.Database(':memory:');
    const manager = new MagSyncManager(memDb);

    // Esperar creación de tabla
    await new Promise(r => setTimeout(r, 60));

    // Obtener catálogo inicial (debe reportar expirado al nacer)
    const initialCatalog = await manager.getCatalog();
    assert.strictEqual(initialCatalog.length, 5, 'Debe devolver 5 capas');
    assert.strictEqual(initialCatalog[0].isExpired, true, 'Inicialmente expirado');

    // Registrar sincronización de 'cultivos_temporales'
    const syncRes = await manager.recordSync('cultivos_temporales', { featuresCount: 1540 });
    assert.strictEqual(syncRes.key, 'cultivos_temporales');
    assert.strictEqual(syncRes.status, 'ACTUALIZADO');
    assert.strictEqual(syncRes.cycleDays, 15);

    // Re-consultar catálogo
    const updatedCatalog = await manager.getCatalog();
    const tempLayer = updatedCatalog.find(c => c.key === 'cultivos_temporales');
    assert.strictEqual(tempLayer.isExpired, false, 'Tras sincronizar debe estar al día');
    assert.strictEqual(tempLayer.daysRemaining, 15, 'Debe indicar 15 días restantes');
    assert.strictEqual(tempLayer.syncStatus, 'ACTUALIZADO');

    // Sincronizar todo
    const syncAllRes = await manager.syncAll(true);
    assert.strictEqual(syncAllRes.length, 5, 'Debe actualizar las 5 capas');
});
