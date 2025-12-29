export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

let nextId = 0;
let toasts = $state<Toast[]>([]);

export function getToasts() {
    return toasts;
}

export function showToast(message: string, type: ToastType = 'success', duration = 3000) {
    const id = nextId++;
    toasts = [...toasts, { id, message, type }];

    setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id);
    }, duration);
}

export function dismissToast(id: number) {
    toasts = toasts.filter(t => t.id !== id);
}
