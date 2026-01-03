import { api } from './client';
import type {
    PersonDetailModel,
    PersonPhotoModel,
    PersonSearchResponse,
    PhotoReorderResponse,
    PersonRelationshipsResponse,
    RelationshipCreatedModel
} from '$lib/types/api';

export interface CreatePersonData {
    firstName?: string;
    lastName?: string;
    birthName?: string;
    gender?: string;
    birthDate?: string;
    deathDate?: string;
    notes?: string;
    photos?: File[];
}

export interface UpdatePersonData {
    firstName?: string | null;
    lastName?: string | null;
    birthName?: string | null;
    gender?: string;
    birthDate?: string | null;
    deathDate?: string | null;
    notes?: string | null;
    photos?: File[];
}

function buildFormData(data: CreatePersonData | UpdatePersonData): FormData {
    const formData = new FormData();

    if (data.firstName !== undefined) {
        formData.append('firstName', data.firstName ?? '');
    }
    if (data.lastName !== undefined) {
        formData.append('lastName', data.lastName ?? '');
    }
    if (data.birthName !== undefined) {
        formData.append('birthName', data.birthName ?? '');
    }
    if (data.gender !== undefined) {
        formData.append('gender', data.gender);
    }
    if (data.birthDate !== undefined) {
        formData.append('birthDate', data.birthDate ?? '');
    }
    if (data.deathDate !== undefined) {
        formData.append('deathDate', data.deathDate ?? '');
    }
    if (data.notes !== undefined) {
        formData.append('notes', data.notes ?? '');
    }
    if (data.photos) {
        for (const photo of data.photos) {
            formData.append('photos', photo);
        }
    }

    return formData;
}

export async function createPerson(treeId: string, data: CreatePersonData): Promise<PersonDetailModel> {
    const formData = buildFormData(data);
    return api.postForm<PersonDetailModel>(`/api/trees/${treeId}/persons`, formData);
}

export async function updatePerson(treeId: string, personId: string, data: UpdatePersonData): Promise<PersonDetailModel> {
    const formData = buildFormData(data);
    return api.putForm<PersonDetailModel>(`/api/trees/${treeId}/persons/${personId}`, formData);
}

export async function deletePerson(treeId: string, personId: string): Promise<void> {
    return api.delete(`/api/trees/${treeId}/persons/${personId}`);
}

export async function getPerson(treeId: string, personId: string): Promise<PersonDetailModel> {
    return api.get<PersonDetailModel>(`/api/trees/${treeId}/persons/${personId}`);
}

export async function deletePhoto(treeId: string, personId: string, photoId: string): Promise<void> {
    return api.delete(`/api/trees/${treeId}/persons/${personId}/photos/${photoId}`);
}

export async function setPrimaryPhoto(treeId: string, personId: string, photoId: string): Promise<PersonPhotoModel> {
    return api.put<PersonPhotoModel>(`/api/trees/${treeId}/persons/${personId}/photos/${photoId}/primary`, {});
}

export async function reorderPhotos(treeId: string, personId: string, photoIds: string[]): Promise<PhotoReorderResponse> {
    return api.put<PhotoReorderResponse>(`/api/trees/${treeId}/persons/${personId}/photos/reorder`, { photoIds });
}

export interface SearchPersonsOptions {
    excludePersonId?: string;
    limit?: number;
}

export async function searchPersons(
    treeId: string,
    query: string,
    options?: SearchPersonsOptions
): Promise<PersonSearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (options?.excludePersonId) {
        params.append('excludePersonId', options.excludePersonId);
    }
    if (options?.limit) {
        params.append('limit', options.limit.toString());
    }
    return api.get<PersonSearchResponse>(`/api/trees/${treeId}/persons/search?${params}`);
}

export interface AddRelationshipData {
    relatedPersonId: string;
    type: 'Parent' | 'Child' | 'Spouse';
}

export async function addRelationship(
    treeId: string,
    personId: string,
    data: AddRelationshipData
): Promise<RelationshipCreatedModel> {
    return api.post<RelationshipCreatedModel>(`/api/trees/${treeId}/persons/${personId}/relationships`, data);
}

export async function removeRelationship(treeId: string, personId: string, relationshipId: string): Promise<void> {
    return api.delete(`/api/trees/${treeId}/persons/${personId}/relationships/${relationshipId}`);
}

export async function getRelationships(treeId: string, personId: string): Promise<PersonRelationshipsResponse> {
    return api.get<PersonRelationshipsResponse>(`/api/trees/${treeId}/persons/${personId}/relationships`);
}
