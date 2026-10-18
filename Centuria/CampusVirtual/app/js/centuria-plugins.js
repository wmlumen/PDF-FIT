/**
 * centuria-plugins.js - Plugins interactivos para el Campus Virtual Centuria
 * Requiere Alpine.js
 */

document.addEventListener('alpine:init', () => {

    // 1. TEMA Y MODO OSCURO
    Alpine.data('centuriaTheme', () => ({
        darkMode: localStorage.getItem('centuria_dark') === 'true',
        init() {
            this.applyTheme();
        },
        toggleTheme() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('centuria_dark', this.darkMode);
            this.applyTheme();
        },
        applyTheme() {
            if(this.darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    }));

    // 2. WIDGET DE NOTIFICACIONES EN VIVO
    Alpine.data('centuriaNotifications', () => ({
        notifications: [],
        unreadCount: 0,
        showPanel: false,
        init() {
            // Mock de notificaciones iniciales
            this.notifications = [
                { id: 1, title: 'Bienvenido', text: 'Bienvenido al nuevo portal de Centuria.', read: false, time: 'Justo ahora', icon: 'bi-stars', color: 'text-amber-500' },
                { id: 2, title: 'Nueva Unidad', text: 'La Unidad 10 de TIC está disponible.', read: false, time: 'Hace 2h', icon: 'bi-book', color: 'text-emerald-500' }
            ];
            this.updateCount();
        },
        updateCount() {
            this.unreadCount = this.notifications.filter(n => !n.read).length;
        },
        markAllRead() {
            this.notifications.forEach(n => n.read = true);
            this.updateCount();
        }
    }));

    // 3. WIDGET DE CALENDARIO INTERACTIVO
    Alpine.data('centuriaCalendar', () => ({
        currentDate: new Date(),
        days: [],
        monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
        eventos: [
            { date: '2026-09-15', title: 'Entrega Trabajo Práctico', type: 'warning' },
            { date: '2026-09-20', title: 'Examen Final Sociología', type: 'danger' }
        ],
        init() {
            this.renderCalendar();
        },
        get monthName() {
            return this.monthNames[this.currentDate.getMonth()] + ' ' + this.currentDate.getFullYear();
        },
        prevMonth() {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        },
        nextMonth() {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        },
        renderCalendar() {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            let daysArray = [];
            
            // Espacios en blanco
            for(let i=0; i<firstDay; i++) {
                daysArray.push({ empty: true });
            }
            
            // Días del mes
            for(let i=1; i<=daysInMonth; i++) {
                const dateString = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                const event = this.eventos.find(e => e.date === dateString);
                const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();
                
                daysArray.push({
                    empty: false,
                    day: i,
                    date: dateString,
                    isToday: isToday,
                    hasEvent: !!event,
                    eventTitle: event ? event.title : '',
                    eventType: event ? event.type : ''
                });
            }
            this.days = daysArray;
        }
    }));

});
