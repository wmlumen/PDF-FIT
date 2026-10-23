/**
 * tests/auth-modal.test.mjs
 * Pruebas unitarias para la validación y gestión de sesión del Login (SNC 551/2023)
 */

globalThis.window = globalThis;
globalThis.localStorage = {
  data: new Map(),
  getItem: (k) => globalThis.localStorage.data.get(k) || null,
  setItem: (k, v) => globalThis.localStorage.data.set(k, String(v)),
  removeItem: (k) => globalThis.localStorage.data.delete(k)
};

import { test } from 'node:test';
import assert from 'node:assert';
const { State } = await import('../js/state.js');

test('Auth - Validación de correo electrónico (RFC 5322 simplificado)', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    assert.strictEqual(emailRegex.test('usuario@snccatastro.gob.py'), true);
    assert.strictEqual(emailRegex.test('profesional.mef@gmail.com'), true);
    assert.strictEqual(emailRegex.test('invalido-sin-arroba'), false);
    assert.strictEqual(emailRegex.test('usuario@sin-dominio'), false);
    assert.strictEqual(emailRegex.test(''), false);
});

test('Auth - Validación de fortaleza mínima de contraseña', () => {
    const isMinLength = (pwd) => typeof pwd === 'string' && pwd.length >= 8;

    assert.strictEqual(isMinLength('12345678'), true, '8 caracteres es válido');
    assert.strictEqual(isMinLength('claveSegura2026'), true, '15 caracteres es válido');
    assert.strictEqual(isMinLength('corta'), false, 'Menos de 8 caracteres es inválido');
    assert.strictEqual(isMinLength(''), false, 'Vacío es inválido');
    assert.strictEqual(isMinLength(null), false, 'Null es inválido');
});

test('Auth - Persistencia y gestión de sesión en State', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoiY2F0YXN0cm9AcHkuZ292In0';
    const mockUser = {
        id: 'user-123',
        email: 'catastro@py.gov',
        name: 'Ing. Agrimensor',
        plan: 'pro'
    };

    // Asignar sesión
    State.setBackendToken(mockToken);
    State.setBackendUser(mockUser);

    assert.strictEqual(State.getBackendToken(), mockToken, 'El token debe estar guardado en State');
    assert.deepStrictEqual(State.getBackendUser(), mockUser, 'El usuario debe estar guardado en State');
    assert.strictEqual(State.getBackendUser().plan, 'pro');

    // Cerrar sesión
    State.setBackendToken('');
    State.setBackendUser(null);

    assert.strictEqual(State.getBackendToken(), '', 'El token debe quedar vacío tras logout');
    assert.strictEqual(State.getBackendUser(), null, 'El usuario debe quedar en null tras logout');
});
