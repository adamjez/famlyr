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

export interface YearRangeModel {
    start: number;
    end: number;
}

export interface FamilyTreeDetailModel {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    personCount: number;
    yearRange: YearRangeModel | null;
    persons: PersonModel[];
    relationships: RelationshipModel[];
}

export interface ImportRequest {
    version: string;
    metadata?: ImportMetadata;
    tree?: ImportTreeInfo;
    persons: ImportPerson[];
    relationships?: ImportRelationship[];
}

export interface ImportMetadata {
    source?: string;
    extractedAt?: string;
    notes?: string;
}

export interface ImportTreeInfo {
    name: string;
    description?: string;
}

export interface ImportPerson {
    tempId: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    birthDate?: string;
    deathDate?: string;
    notes?: string;
}

export interface ImportRelationship {
    type: string;
    person1TempId?: string;
    person2TempId?: string;
    parentTempId?: string;
    childTempId?: string;
}

export interface ImportResponse {
    success: boolean;
    dryRun: boolean;
    treeId?: string;
    summary?: ImportSummary;
    personIdMap?: Record<string, string>;
    errors?: ImportError[];
}

export interface ImportSummary {
    personsCreated: number;
    relationshipsCreated: number;
    warnings: ImportWarning[];
}

export interface ImportError {
    type: string;
    tempId?: string;
    index?: number;
    field?: string;
    message: string;
}

export interface ImportWarning {
    tempId?: string;
    message: string;
}
