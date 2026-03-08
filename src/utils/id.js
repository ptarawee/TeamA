export function generateId(prefix = '') {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${id}` : id;
}
