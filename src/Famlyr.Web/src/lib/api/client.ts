import { PUBLIC_API_URL } from "$env/static/public";

const API_BASE = PUBLIC_API_URL || "http://localhost:5240";

export class ApiError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        message?: string
    ) {
        super(message || `${status} ${statusText}`);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
    }
    return response.json();
}

async function handleResponseWithErrorBody<T>(response: Response, validErrorStatuses: number[] = [400]): Promise<T> {
    if (response.ok || validErrorStatuses.includes(response.status)) {
        return response.json();
    }
    throw new ApiError(response.status, response.statusText);
}

export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                Accept: 'application/json'
            }
        });
        return handleResponse<T>(response);
    },

    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(data)
        });
        return handleResponse<T>(response);
    },

    /**
     * POST request that returns the response body even for specified error statuses.
     * Useful for endpoints that return structured error responses (e.g., validation errors).
     */
    postWithErrorBody: async <T>(endpoint: string, data: unknown, validErrorStatuses: number[] = [400]): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(data)
        });
        return handleResponseWithErrorBody<T>(response, validErrorStatuses);
    },

    put: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(data)
        });
        return handleResponse<T>(response);
    },

    delete: async (endpoint: string): Promise<void> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new ApiError(response.status, response.statusText);
        }
    }
};
