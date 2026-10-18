/** Historial transaccional acotado para geometrías GeoJSON. */
export class GeometryHistory {
    constructor(limit = 50) {
        this.limit = Math.max(1, Number(limit) || 50);
        this.undoStack = [];
        this.redoStack = [];
        this.current = null;
    }

    static clone(value) {
        return value == null ? value : structuredClone(value);
    }

    reset(value) {
        this.undoStack = [];
        this.redoStack = [];
        this.current = value || null;
    }

    syncExternal(value) {
        if (this.current !== value) this.reset(value);
    }

    commit(previous, next, label = 'Edición geométrica') {
        if (!previous || !next) return null;
        this.undoStack.push({ value: GeometryHistory.clone(previous), label });
        if (this.undoStack.length > this.limit) this.undoStack.shift();
        this.redoStack = [];
        this.current = next;
        return next;
    }

    undo(current) {
        const entry = this.undoStack.pop();
        if (!entry) return null;
        this.redoStack.push({ value: GeometryHistory.clone(current), label: entry.label });
        this.current = GeometryHistory.clone(entry.value);
        return { value: this.current, label: entry.label };
    }

    redo(current) {
        const entry = this.redoStack.pop();
        if (!entry) return null;
        this.undoStack.push({ value: GeometryHistory.clone(current), label: entry.label });
        this.current = GeometryHistory.clone(entry.value);
        return { value: this.current, label: entry.label };
    }

    rollbackLastCommit() {
        const entry = this.undoStack.pop();
        if (!entry) return null;
        this.redoStack = [];
        this.current = GeometryHistory.clone(entry.value);
        return this.current;
    }

    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
}
