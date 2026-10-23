/**
 * authModal.js - Modal y Controlador de Autenticación Accesible (SNC 551/2023)
 * Cumple estándares WCAG 2.1 AA, validación segura, tokens JWT y manejo de estados.
 */

import { State } from './state.js';
import { showToast } from './utils.js';

export const AuthModal = {
    modalEl: null,
    formEl: null,
    usernameInput: null,
    passwordInput: null,
    rememberCheckbox: null,
    submitBtn: null,
    btnText: null,
    btnSpinner: null,
    alertBox: null,
    alertMessage: null,
    btnTogglePassword: null,
    isSubmitting: false,

    init() {
        this.modalEl = document.getElementById('authModal');
        this.formEl = document.getElementById('login-form');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.rememberCheckbox = document.getElementById('remember-me');
        this.submitBtn = document.getElementById('login-button');
        this.btnText = this.submitBtn?.querySelector('.btn-text');
        this.btnSpinner = this.submitBtn?.querySelector('.btn-spinner');
        this.alertBox = document.getElementById('login-alert');
        this.alertMessage = document.getElementById('login-alert-message');
        this.btnTogglePassword = document.getElementById('btn-toggle-password');

        this.bindEvents();
        this.updateHeaderUI();
        this.restoreRememberedUser();
    },

    bindEvents() {
        if (this.formEl) {
            this.formEl.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (this.btnTogglePassword) {
            this.btnTogglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        this.usernameInput?.addEventListener('input', () => this.clearFieldError(this.usernameInput, 'username-error'));
        this.passwordInput?.addEventListener('input', () => this.clearFieldError(this.passwordInput, 'password-error'));

        // Cerrar con Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    },

    isOpen() {
        return Boolean(this.modalEl && !this.modalEl.classList.contains('hidden'));
    },

    open() {
        if (!this.modalEl) return;
        this.modalEl.classList.remove('hidden');
        this.modalEl.classList.add('flex');
        this.hideAlert();
        setTimeout(() => this.usernameInput?.focus(), 80);
    },

    close() {
        if (!this.modalEl) return;
        this.modalEl.classList.add('hidden');
        this.modalEl.classList.remove('flex');
        this.hideAlert();
    },

    togglePasswordVisibility() {
        if (!this.passwordInput || !this.btnTogglePassword) return;
        const isPassword = this.passwordInput.type === 'password';
        this.passwordInput.type = isPassword ? 'text' : 'password';
        this.btnTogglePassword.setAttribute('aria-pressed', String(isPassword));
        this.btnTogglePassword.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        
        const showIcon = document.getElementById('icon-eye-show');
        const hideIcon = document.getElementById('icon-eye-hide');
        if (showIcon && hideIcon) {
            showIcon.classList.toggle('hidden', isPassword);
            hideIcon.classList.toggle('hidden', !isPassword);
        }
    },

    validate() {
        let isValid = true;
        const username = this.usernameInput?.value.trim() || '';
        const password = this.passwordInput?.value || '';

        if (!username) {
            this.setFieldError(this.usernameInput, 'username-error', 'El usuario o correo es obligatorio.');
            isValid = false;
        } else if (username.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
            this.setFieldError(this.usernameInput, 'username-error', 'Formato de correo electrónico inválido.');
            isValid = false;
        }

        if (!password) {
            this.setFieldError(this.passwordInput, 'password-error', 'La contraseña es obligatoria.');
            isValid = false;
        } else if (password.length < 8) {
            this.setFieldError(this.passwordInput, 'password-error', 'Mínimo 8 caracteres requeridos.');
            isValid = false;
        }

        return isValid;
    },

    setFieldError(inputEl, errorId, message) {
        if (!inputEl) return;
        inputEl.classList.add('is-invalid');
        inputEl.setAttribute('aria-invalid', 'true');
        const errEl = document.getElementById(errorId);
        if (errEl) {
            errEl.textContent = message;
            errEl.removeAttribute('hidden');
        }
    },

    clearFieldError(inputEl, errorId) {
        if (!inputEl) return;
        inputEl.classList.remove('is-invalid');
        inputEl.setAttribute('aria-invalid', 'false');
        const errEl = document.getElementById(errorId);
        if (errEl) {
            errEl.textContent = '';
            errEl.setAttribute('hidden', '');
        }
        this.hideAlert();
    },

    showAlert(message, type = 'error') {
        if (!this.alertBox || !this.alertMessage) return;
        this.alertMessage.textContent = message;
        this.alertBox.className = `login-alert ${type === 'success' ? 'alert-success' : ''}`;
        this.alertBox.removeAttribute('hidden');
    },

    hideAlert() {
        if (this.alertBox) this.alertBox.setAttribute('hidden', '');
    },

    setLoading(isLoading) {
        this.isSubmitting = isLoading;
        if (this.submitBtn) {
            this.submitBtn.disabled = isLoading;
            this.submitBtn.setAttribute('aria-busy', String(isLoading));
        }
        if (this.usernameInput) this.usernameInput.disabled = isLoading;
        if (this.passwordInput) this.passwordInput.disabled = isLoading;

        if (isLoading) {
            if (this.btnText) this.btnText.textContent = 'Verificando...';
            this.btnSpinner?.classList.remove('hidden');
        } else {
            if (this.btnText) this.btnText.textContent = 'Ingresar al Sistema';
            this.btnSpinner?.classList.add('hidden');
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isSubmitting) return;

        this.hideAlert();
        if (!this.validate()) return;

        const email = this.usernameInput.value.trim();
        const password = this.passwordInput.value;
        const remember = Boolean(this.rememberCheckbox?.checked);

        this.setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                switch (response.status) {
                    case 400:
                        throw new Error(data.error || 'Solicitud incompleta o datos inválidos.');
                    case 401:
                        throw new Error('Credenciales incorrectas. Verifique usuario y contraseña.');
                    case 403:
                        throw new Error(data.error || 'Usuario inactivo o suspendido.');
                    case 429:
                        throw new Error('Demasiados intentos fallidos. Espere unos minutos.');
                    case 500:
                    default:
                        throw new Error(data.error || 'Error en el servidor de autenticación.');
                }
            }

            // Persistir token y datos de usuario en State
            if (data.token) {
                State.setBackendToken(data.token);
            }
            if (data.user) {
                State.setBackendUser(data.user);
            }

            if (remember) {
                localStorage.setItem('snc_saved_username', email);
            } else {
                localStorage.removeItem('snc_saved_username');
            }

            this.showAlert('¡Inicio de sesión exitoso!', 'success');
            showToast?.(`Bienvenido, ${data.user?.name || data.user?.email || 'Usuario'}`, 'success');

            setTimeout(() => {
                this.close();
                this.updateHeaderUI();
                if (this.passwordInput) this.passwordInput.value = '';
            }, 600);

        } catch (err) {
            this.showAlert(err.message, 'error');
            if (this.passwordInput) {
                this.passwordInput.value = '';
                this.passwordInput.focus();
            }
        } finally {
            this.setLoading(false);
        }
    },

    logout() {
        State.setBackendToken('');
        State.setBackendUser(null);
        showToast?.('Sesión cerrada correctamente', 'info');
        this.updateHeaderUI();
    },

    updateHeaderUI() {
        const user = State.getBackendUser?.();
        const token = State.getBackendToken?.();
        const authBtn = document.getElementById('btn-header-auth');
        const userBadge = document.getElementById('header-user-badge');
        const userPlan = document.getElementById('header-user-plan');

        if (token && user) {
            if (authBtn) {
                authBtn.setAttribute('data-tooltip', `Sesión activa: ${user.email} (Clic para perfil/cerrar)`);
                authBtn.innerHTML = '<i class="fas fa-user-check text-emerald-400"></i>';
                authBtn.onclick = () => window.App?.openProfile?.();
            }
            if (userBadge) {
                userBadge.textContent = user.name || user.email.split('@')[0];
                userBadge.classList.remove('hidden');
            }
            if (userPlan) {
                userPlan.textContent = (user.plan || 'Free').toUpperCase();
                userPlan.classList.remove('hidden');
            }
        } else {
            if (authBtn) {
                authBtn.setAttribute('data-tooltip', 'Iniciar Sesión');
                authBtn.innerHTML = '<i class="fas fa-arrow-right-to-bracket text-indigo-400"></i>';
                authBtn.onclick = () => this.open();
            }
            if (userBadge) userBadge.classList.add('hidden');
            if (userPlan) userPlan.classList.add('hidden');
        }
    },

    restoreRememberedUser() {
        const savedUser = localStorage.getItem('snc_saved_username');
        if (savedUser && this.usernameInput) {
            this.usernameInput.value = savedUser;
            if (this.rememberCheckbox) this.rememberCheckbox.checked = true;
        }
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.AuthModal = AuthModal;
}
