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

export interface PersonPhotoModel {
    id: string;
    isPrimary: boolean;
    createdAt: string;
    order: number;
    imageUrl: string;
}

export interface PersonDetailModel {
    id: string;
    firstName: string | null;
    lastName: string | null;
    gender: string;
    birthDate: string | null;
    deathDate: string | null;
    notes: string | null;
    photos: PersonPhotoModel[];
}

export interface PersonSearchResultModel {
    id: string;
    firstName: string | null;
    lastName: string | null;
    gender: string;
    birthDate: string | null;
    deathDate: string | null;
}

export interface PersonSearchResponse {
    persons: PersonSearchResultModel[];
}

export interface PhotoReorderResponse {
    photos: PersonPhotoModel[];
}

export interface RelatedPersonModel {
    id: string;
    firstName: string | null;
    lastName: string | null;
    gender: string;
}

export interface PersonRelationshipModel {
    relationshipId: string;
    person: RelatedPersonModel;
}

export interface PersonRelationshipsResponse {
    parents: PersonRelationshipModel[];
    children: PersonRelationshipModel[];
    spouses: PersonRelationshipModel[];
}

export interface RelationshipCreatedModel {
    id: string;
    type: string;
    subjectId: string;
    relativeId: string;
}

export interface ErrorResponse {
    code: string;
    message: string;
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

export interface CreateFamilyTreeRequest {
    name: string;
    description?: string;
}

export interface UpdateFamilyTreeRequest {
    name: string;
    description?: string;
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

export interface TreeStatisticsModel {
    summary: SummaryStats;
    genderStats: GenderStats;
    lifespanStats: LifespanStats;
    firstNameStats: NameStatItem[];
    lastNameStats: NameStatItem[];
    birthWeekdayStats: WeekdayStatItem[];
    birthDayOfMonthStats: DayOfMonthStatItem[];
    birthMonthStats: MonthStatItem[];
    birthDecadeStats: DecadeStatItem[];
}

export interface SummaryStats {
    totalPersons: number;
    personsWithBirthDate: number;
    personsWithDeathDate: number;
    livingPersons: number;
}

export interface GenderStats {
    male: number;
    female: number;
    other: number;
    unknown: number;
}

export interface LifespanStats {
    averageLifespanYears: number | null;
    oldestDeathAge: number | null;
    youngestDeathAge: number | null;
    personsWithLifespan: number;
}

export interface NameStatItem {
    name: string;
    count: number;
}

export interface WeekdayStatItem {
    weekday: number;
    label: string;
    count: number;
}

export interface DayOfMonthStatItem {
    day: number;
    count: number;
}

export interface MonthStatItem {
    month: number;
    label: string;
    count: number;
}

export interface DecadeStatItem {
    decade: number;
    count: number;
}
