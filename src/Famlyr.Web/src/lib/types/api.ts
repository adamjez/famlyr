export type Gender = 'Male' | 'Female' | 'Other' | 'Unknown';
export type RelationshipType = 'Parent' | 'Spouse';

export interface PersonModel {
    id: string;
    firstName: string | null;
    lastName: string | null;
    gender: Gender;
    birthDate: string | null;
    deathDate: string | null;
}

export interface RelationshipModel {
    id: string;
    type: RelationshipType;
    subjectId: string;
    relativeId: string;
}

export interface FamilyTreeModel {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    persons: PersonModel[];
    relationships: RelationshipModel[];
}

export interface FamilyTreeSummaryModel {
    id: string;
    name: string;
    description: string | null;
    personCount: number;
}

export interface FamilyTreeListResponse {
    trees: FamilyTreeSummaryModel[];
}
