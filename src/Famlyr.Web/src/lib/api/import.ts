import type { ImportRequest, ImportResponse } from '$lib/types/api';
import { api } from './client';

export async function importIntoExistingTree(
    treeId: string,
    request: ImportRequest,
    dryRun: boolean = false
): Promise<ImportResponse> {
    const endpoint = `/api/trees/${treeId}/import${dryRun ? '?dryRun=true' : ''}`;
    return api.postWithErrorBody<ImportResponse>(endpoint, request);
}

export async function importWithNewTree(
    request: ImportRequest,
    dryRun: boolean = false
): Promise<ImportResponse> {
    const endpoint = `/api/trees/import${dryRun ? '?dryRun=true' : ''}`;
    return api.postWithErrorBody<ImportResponse>(endpoint, request);
}
