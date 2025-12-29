import type {
    FamilyTreeModel,
    FamilyTreeListResponse,
    FamilyTreeDetailModel,
    TreeStatisticsModel,
    CreateFamilyTreeRequest,
    UpdateFamilyTreeRequest
} from '$lib/types/api';
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

export async function getTreeStatistics(id: string): Promise<TreeStatisticsModel> {
    return api.get<TreeStatisticsModel>(`/api/trees/${id}/statistics`);
}

export async function createFamilyTree(data: CreateFamilyTreeRequest): Promise<FamilyTreeDetailModel> {
    return api.post<FamilyTreeDetailModel>('/api/trees', data);
}

export async function updateFamilyTree(id: string, data: UpdateFamilyTreeRequest): Promise<FamilyTreeDetailModel> {
    return api.put<FamilyTreeDetailModel>(`/api/trees/${id}`, data);
}

export async function deleteFamilyTree(id: string): Promise<void> {
    return api.delete(`/api/trees/${id}`);
}
