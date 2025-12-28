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
