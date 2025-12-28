import type { FamilyTreeModel, FamilyTreeListResponse } from '$lib/types/api';
import { api } from './client';

export async function getFamilyTree(id: string): Promise<FamilyTreeModel> {
    return api.get<FamilyTreeModel>(`/api/familytree/${id}`);
}

export async function getFamilyTrees(): Promise<FamilyTreeListResponse> {
    return api.get<FamilyTreeListResponse>('/api/trees');
}
