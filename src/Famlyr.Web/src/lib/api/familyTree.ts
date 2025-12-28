import type { FamilyTreeModel, FamilyTreeListResponse, FamilyTreeDetailModel } from '$lib/types/api';
import { api } from './client';

export async function getFamilyTree(id: string): Promise<FamilyTreeModel> {
    return api.get<FamilyTreeModel>(`/api/trees/${id}`);
}

export async function getFamilyTrees(): Promise<FamilyTreeListResponse> {
    return api.get<FamilyTreeListResponse>('/api/trees');
}

export async function getTreeDetails(id: string): Promise<FamilyTreeDetailModel> {
    return api.get<FamilyTreeDetailModel>(`/api/trees/${id}/details`);
}
