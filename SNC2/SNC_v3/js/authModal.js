/**
 * authModal.js - Modal y Controlador de Autenticación y Registro Accesible (SNC 551/2023)
 * Cumple estándares WCAG 2.1 AA, validación segura, tokens JWT, alta de cliente y selección de uso previsto.
 */

import { State } from './state.js';
import { showToast } from './utils.js';

export const AuthModal = {
    modalEl: null,
    currentMode: 'login', // 'login' | 'register'

    // Elementos de Login
    formEl: null,
    usernameInput: null,
    passwordInput: null,
    rememberCheckbox: null,
    submitBtn: null,
    btnText: null,
    btnSpinner: null,
    btnTogglePassword: null,

    // Elementos de Registro / Alta
    regFormEl: null,
    regNameInput: null,
    regEmailInput: null,
    regUsageInput: null,
    regPasswordInput: null,
    regConfirmInput: null,
    regSubmitBtn: null,
    regBtnText: null,
    regBtnSpinner: null,
    btnToggleRegPassword: null,

    // Controles de Modo y Alertas
    tabLoginBtn: null,
    tabRegisterBtn: null,
    loginView: null,
    registerView: null,
    alertBox: null,
    alertMessage: null,
    isSubmitting: false,

    init() {
        this.modalEl = document.getElementById('authModal');
        this.tabLoginBtn = document.getElementById('tab-login-btn');
        this.tabRegisterBtn = document.getElementById('tab-register-btn');
        this.loginView = document.getElementById('login-view');
        this.registerView = document.getElementById('register-view');
        this.alertBox = document.getElementById('login-alert');
        this.alertMessage = document.getElementById('login-alert-message');

        // Formulario Login
        this.formEl = document.getElementById('login-form');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.rememberCheckbox = document.getElementById('remember-me');
        this.submitBtn = document.getElementById('login-button');
        this.btnText = this.submitBtn?.querySelector('.btn-text');
        this.btnSpinner = this.submitBtn?.querySelector('.btn-spinner');
        this.btnTogglePassword = document.getElementById('btn-toggle-password');

        // Formulario Registro
        this.regFormEl = document.getElementById('register-form');
        this.regNameInput = document.getElementById('reg-name-modal');
        this.regEmailInput = document.getElementById('reg-email-modal');
        this.regUsageInput = document.getElementById('reg-usage-modal');
        this.regPasswordInput = document.getElementById('reg-password-modal');
        this.regConfirmInput = document.getElementById('reg-confirm-modal');
        this.regSubmitBtn = document.getElementById('register-button');
        this.regBtnText = this.regSubmitBtn?.querySelector('.reg-btn-text');
        this.regBtnSpinner = this.regSubmitBtn?.querySelector('.reg-btn-spinner');
        this.btnToggleRegPassword = document.getElementById('btn-toggle-reg-password');

        this.bindEvents();
        this.updateHeaderUI();
        this.restoreRememberedUser();
    },

    bindEvents() {
        // Envíos de formulario
        if (this.formEl) {
            this.formEl.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.regFormEl) {
            this.regFormEl.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
        }

        // Toggles de contraseña
        if (this.btnTogglePassword) {
            this.btnTogglePassword.addEventListener('click', () => this.togglePasswordVisibility(this.passwordInput, this.btnTogglePassword, 'icon-eye-show', 'icon-eye-hide'));
        }
        if (this.btnToggleRegPassword) {
            this.btnToggleRegPassword.addEventListener('click', () => this.togglePasswordVisibility(this.regPasswordInput, this.btnToggleRegPassword, 'reg-icon-eye-show', 'reg-icon-eye-hide'));
        }

        // Limpieza de errores en input
        this.usernameInput?.addEventListener('input', () => this.clearFieldError(this.usernameInput, 'username-error'));
        this.passwordInput?.addEventListener('input', () => this.clearFieldError(this.passwordInput, 'password-error'));
        this.regNameInput?.addEventListener('input', () => this.clearFieldError(this.regNameInput, 'reg-name-error'));
        this.regEmailInput?.addEventListener('input', () => this.clearFieldError(this.regEmailInput, 'reg-email-error'));
        this.regUsageInput?.addEventListener('change', () => this.clearFieldError(this.regUsageInput, 'reg-usage-error'));
        this.regPasswordInput?.addEventListener('input', () => this.clearFieldError(this.regPasswordInput, 'reg-password-error'));
        this.regConfirmInput?.addEventListener('input', () => this.clearFieldError(this.regConfirmInput, 'reg-confirm-error'));

        // Cerrar con Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    },

    setMode(mode = 'login') {
        this.currentMode = mode;
        this.hideAlert();

        const titleEl = document.getElementById('login-title');

        if (mode === 'login') {
            if (this.loginView) this.loginView.classList.remove('hidden');
            if (this.registerView) this.registerView.classList.add('hidden');
            if (titleEl) titleEl.textContent = 'Iniciar Sesión';

            if (this.tabLoginBtn) {
                this.tabLoginBtn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg transition bg-indigo-600 text-white shadow';
            }
            if (this.tabRegisterBtn) {
                this.tabRegisterBtn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white';
            }
            setTimeout(() => this.usernameInput?.focus(), 80);
        } else {
            if (this.loginView) this.loginView.classList.add('hidden');
            if (this.registerView) this.registerView.classList.remove('hidden');
            if (titleEl) titleEl.textContent = 'Crear Cuenta / Alta de Cliente';

            if (this.tabLoginBtn) {
                this.tabLoginBtn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white';
            }
            if (this.tabRegisterBtn) {
                this.tabRegisterBtn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg transition bg-emerald-600 text-white shadow';
            }
            setTimeout(() => this.regNameInput?.focus(), 80);
        }
    },

    isOpen() {
        return Boolean(this.modalEl && !this.modalEl.classList.contains('hidden'));
    },

    open(mode = 'login') {
        if (!this.modalEl) return;
        this.modalEl.classList.remove('hidden');
        this.modalEl.classList.add('flex');
        this.setMode(mode);
    },

    close() {
        if (!this.modalEl) return;
        this.modalEl.classList.add('hidden');
        this.modalEl.classList.remove('flex');
        this.hideAlert();
    },

    togglePasswordVisibility(inputEl, btnEl, showIconId, hideIconId) {
        if (!inputEl || !btnEl) return;
        const isPassword = inputEl.type === 'password';
        inputEl.type = isPassword ? 'text' : 'password';
        btnEl.setAttribute('aria-pressed', String(isPassword));
        btnEl.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        
        const showIcon = document.getElementById(showIconId);
        const hideIcon = document.getElementById(hideIconId);
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

    validateRegister() {
        let isValid = true;
        const name = this.regNameInput?.value.trim() || '';
        const email = this.regEmailInput?.value.trim().toLowerCase() || '';
        const usage = this.regUsageInput?.value || '';
        const password = this.regPasswordInput?.value || '';
        const confirm = this.regConfirmInput?.value || '';

        if (!name) {
            this.setFieldError(this.regNameInput, 'reg-name-error', 'El nombre completo es obligatorio.');
            isValid = false;
        }

        if (!email) {
            this.setFieldError(this.regEmailInput, 'reg-email-error', 'El correo electrónico es obligatorio.');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.setFieldError(this.regEmailInput, 'reg-email-error', 'Formato de correo electrónico inválido.');
            isValid = false;
        }

        if (!usage) {
            this.setFieldError(this.regUsageInput, 'reg-usage-error', 'Seleccione para qué uso será el sistema.');
            isValid = false;
        }

        if (!password) {
            this.setFieldError(this.regPasswordInput, 'reg-password-error', 'La contraseña es obligatoria.');
            isValid = false;
        } else if (password.length < 8) {
            this.setFieldError(this.regPasswordInput, 'reg-password-error', 'Mínimo 8 caracteres requeridos.');
            isValid = false;
        } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            this.setFieldError(this.regPasswordInput, 'reg-password-error', 'Debe contener mayúscula, minúscula, número y símbolo.');
            isValid = false;
        }

        if (!confirm) {
            this.setFieldError(this.regConfirmInput, 'reg-confirm-error', 'Confirme su contraseña.');
            isValid = false;
        } else if (password !== confirm) {
            this.setFieldError(this.regConfirmInput, 'reg-confirm-error', 'Las contraseñas no coinciden.');
            isValid = false;
        }

        return isValid;
    },

    setFieldError(inputEl, errorId, message) {
        if (!inputEl) return;
        inputEl.classList.add('is-invalid', 'border-red-500');
        inputEl.setAttribute('aria-invalid', 'true');
        const errEl = document.getElementById(errorId);
        if (errEl) {
            errEl.textContent = message;
            errEl.removeAttribute('hidden');
        }
    },

    clearFieldError(inputEl, errorId) {
        if (!inputEl) return;
        inputEl.classList.remove('is-invalid', 'border-red-500');
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
        this.alertBox.className = `login-alert ${type === 'success' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200' : 'bg-red-950/80 border border-red-800 text-red-200'} p-2.5 rounded-lg text-xs font-medium mb-3`;
        this.alertBox.removeAttribute('hidden');
        this.alertBox.classList.remove('hidden');
    },

    hideAlert() {
        if (this.alertBox) {
            this.alertBox.setAttribute('hidden', '');
            this.alertBox.classList.add('hidden');
        }
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

    setRegLoading(isLoading) {
        this.isSubmitting = isLoading;
        if (this.regSubmitBtn) {
            this.regSubmitBtn.disabled = isLoading;
            this.regSubmitBtn.setAttribute('aria-busy', String(isLoading));
        }
        if (this.regNameInput) this.regNameInput.disabled = isLoading;
        if (this.regEmailInput) this.regEmailInput.disabled = isLoading;
        if (this.regUsageInput) this.regUsageInput.disabled = isLoading;
        if (this.regPasswordInput) this.regPasswordInput.disabled = isLoading;
        if (this.regConfirmInput) this.regConfirmInput.disabled = isLoading;

        if (isLoading) {
            if (this.regBtnText) this.regBtnText.textContent = 'Creando cuenta...';
            this.regBtnSpinner?.classList.remove('hidden');
        } else {
            if (this.regBtnText) this.regBtnText.textContent = 'Dar de Alta y Acceder';
            this.regBtnSpinner?.classList.add('hidden');
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

    async handleRegisterSubmit(e) {
        e.preventDefault();
        if (this.isSubmitting) return;

        this.hideAlert();
        if (!this.validateRegister()) return;

        const name = this.regNameInput.value.trim();
        const email = this.regEmailInput.value.trim().toLowerCase();
        const usage = this.regUsageInput.value;
        const password = this.regPasswordInput.value;

        this.setRegLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ name, email, password, usage })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 409) {
                    throw new Error('Este correo ya está registrado en el sistema. Cambie a "Iniciar Sesión".');
                }
                throw new Error(data.error || 'Error creando la cuenta de usuario.');
            }

            // Persistir sesión activa
            if (data.token) {
                State.setBackendToken(data.token);
            }
            if (data.user) {
                State.setBackendUser(data.user);
            }

            this.showAlert('¡Cuenta creada y dada de alta exitosamente!', 'success');
            showToast?.(`¡Bienvenido al SNC, ${data.user?.name || 'Usuario'}!`, 'success');

            setTimeout(() => {
                this.close();
                this.updateHeaderUI();
                if (this.regPasswordInput) this.regPasswordInput.value = '';
                if (this.regConfirmInput) this.regConfirmInput.value = '';
            }, 600);

        } catch (err) {
            this.showAlert(err.message, 'error');
            if (err.message.includes('ya está registrado')) {
                setTimeout(() => this.setMode('login'), 2000);
            }
        } finally {
            this.setRegLoading(false);
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
                const usoLabel = user.uso ? ` [${user.uso}]` : '';
                authBtn.setAttribute('data-tooltip', `Sesión activa: ${user.email}${usoLabel} (Clic para perfil/cerrar)`);
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
                authBtn.setAttribute('data-tooltip', 'Acceso / Iniciar Sesión / Registro');
                authBtn.innerHTML = '<i class="fas fa-arrow-right-to-bracket text-indigo-400"></i>';
                authBtn.onclick = () => this.open('login');
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
