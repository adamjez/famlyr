import type { PersonModel } from './api';

export interface Position {
    x: number;
    y: number;
}

export interface TreeNode {
    id: string;
    person: PersonModel;
    position: Position;
    layer: number;
    spouseIds: string[];
    childIds: string[];
    parentIds: string[];
    isSelected: boolean;
    width: number;
    height: number;
    isCollapsed: boolean;
    descendantCount: number;
    isFocusLineage: boolean;
    isVisible: boolean;
}

export interface TreeBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
}

export interface TreeConnection {
    type: 'parent-child' | 'spouse';
    fromIds: string[];
    toIds: string[];
}

export interface TreeLayout {
    nodes: Map<string, TreeNode>;
    bounds: TreeBounds;
    layers: Map<number, TreeNode[]>;
    connections: TreeConnection[];
}

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
}

export interface LayoutConfig {
    siblingGap: number;
    generationGap: number;
    spouseGap: number;
    branchGap: number;
    nodeWidth: number;
    nodeHeight: number;
    padding: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    siblingGap: 200,
    generationGap: 150,
    spouseGap: 50,
    branchGap: 100,
    nodeWidth: 160,
    nodeHeight: 80,
    padding: 100
};

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 3.0;

export type LODLevel = 1 | 2 | 3;

export interface LODConfig {
    nodeWidth: number;
    nodeHeight: number;
    showPhoto: boolean;
    showName: boolean;
    showYears: boolean;
    truncateName: number | null;
}

export const LOD_CONFIGS: Record<LODLevel, LODConfig> = {
    1: { nodeWidth: 20, nodeHeight: 20, showPhoto: false, showName: false, showYears: false, truncateName: null },
    2: { nodeWidth: 80, nodeHeight: 50, showPhoto: false, showName: true, showYears: true, truncateName: 12 },
    3: { nodeWidth: 160, nodeHeight: 80, showPhoto: true, showName: true, showYears: true, truncateName: null }
};

export const LOD_THRESHOLDS = {
    lod1Max: 0.2,
    lod2Max: 0.5
};

export function getLODLevel(zoom: number): LODLevel {
    if (zoom < LOD_THRESHOLDS.lod1Max) return 1;
    if (zoom < LOD_THRESHOLDS.lod2Max) return 2;
    return 3;
}

export interface FoldState {
    expandedNodeIds: Set<string>;
}
