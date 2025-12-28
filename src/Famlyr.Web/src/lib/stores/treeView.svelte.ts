import type { FamilyTreeModel, PersonModel } from '$lib/types/api';
import type { TreeLayout, Viewport, TreeNode } from '$lib/types/tree';
import { ZOOM_MIN, ZOOM_MAX } from '$lib/types/tree';

function createTreeViewState() {
    let tree = $state<FamilyTreeModel | null>(null);
    let layout = $state<TreeLayout | null>(null);

    let viewport = $state<Viewport>({
        x: 0,
        y: 0,
        zoom: 1,
        width: 0,
        height: 0
    });

    let selectedPersonId = $state<string | null>(null);
    let focusedPersonId = $state<string | null>(null);

    const selectedPerson = $derived.by<PersonModel | null>(() => {
        if (!tree || !selectedPersonId) return null;
        return tree.persons.find(p => p.id === selectedPersonId) ?? null;
    });

    const selectedNode = $derived.by<TreeNode | null>(() => {
        if (!layout || !selectedPersonId) return null;
        return layout.nodes.get(selectedPersonId) ?? null;
    });

    return {
        get tree() { return tree; },
        get layout() { return layout; },
        get viewport() { return viewport; },
        get selectedPersonId() { return selectedPersonId; },
        get focusedPersonId() { return focusedPersonId; },
        get selectedPerson() { return selectedPerson; },
        get selectedNode() { return selectedNode; },

        setTree(newTree: FamilyTreeModel) {
            tree = newTree;
            if (!focusedPersonId && newTree.persons.length > 0) {
                focusedPersonId = newTree.persons[0].id;
            }
        },

        setLayout(newLayout: TreeLayout) {
            layout = newLayout;
        },

        setViewport(updates: Partial<Viewport>) {
            viewport = { ...viewport, ...updates };
        },

        pan(deltaX: number, deltaY: number) {
            viewport = { ...viewport, x: viewport.x + deltaX, y: viewport.y + deltaY };
        },

        zoom(newZoom: number, centerX?: number, centerY?: number) {
            const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
            const zoomRatio = clampedZoom / viewport.zoom;

            const pivotX = (centerX ?? viewport.width / 2) - viewport.width / 2;
            const pivotY = (centerY ?? viewport.height / 2) - viewport.height / 2;

            viewport = {
                ...viewport,
                x: pivotX + (viewport.x - pivotX) * zoomRatio,
                y: pivotY + (viewport.y - pivotY) * zoomRatio,
                zoom: clampedZoom
            };
        },

        selectPerson(personId: string | null) {
            selectedPersonId = personId;
        },

        setFocusPerson(personId: string | null) {
            focusedPersonId = personId;
        },

        resetViewport() {
            viewport = { ...viewport, x: 0, y: 0, zoom: 1 };
        }
    };
}

export const treeViewState = createTreeViewState();
