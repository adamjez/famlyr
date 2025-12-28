import type { FamilyTreeModel, PersonModel } from '$lib/types/api';
import type { TreeLayout, Viewport, TreeNode } from '$lib/types/tree';
import { ZOOM_MAX } from '$lib/types/tree';

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

    let fitZoom = $state<number>(0.1);

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

    function calculateFitZoom(): number {
        if (!layout || viewport.width === 0 || viewport.height === 0) {
            return 0.1;
        }

        const bounds = layout.bounds;
        const treeWidth = bounds.width;
        const treeHeight = bounds.height;

        const zoomX = viewport.width / treeWidth;
        const zoomY = viewport.height / treeHeight;

        const calculatedZoom = Math.min(zoomX, zoomY) * 0.95;
        return Math.max(0.001, calculatedZoom);
    }

    function calculateFitPosition(zoom: number): { x: number; y: number } {
        if (!layout) {
            return { x: 0, y: 0 };
        }

        const bounds = layout.bounds;
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        return {
            x: -centerX * zoom,
            y: -centerY * zoom
        };
    }

    return {
        get tree() { return tree; },
        get layout() { return layout; },
        get viewport() { return viewport; },
        get selectedPersonId() { return selectedPersonId; },
        get focusedPersonId() { return focusedPersonId; },
        get selectedPerson() { return selectedPerson; },
        get selectedNode() { return selectedNode; },
        get fitZoom() { return fitZoom; },

        setTree(newTree: FamilyTreeModel) {
            tree = newTree;
            if (!focusedPersonId && newTree.persons.length > 0) {
                focusedPersonId = newTree.persons[0].id;
            }
        },

        setLayout(newLayout: TreeLayout) {
            layout = newLayout;
            fitZoom = calculateFitZoom();
        },

        setViewport(updates: Partial<Viewport>) {
            viewport = { ...viewport, ...updates };
            fitZoom = calculateFitZoom();
        },

        pan(deltaX: number, deltaY: number) {
            viewport = { ...viewport, x: viewport.x + deltaX, y: viewport.y + deltaY };
        },

        zoom(newZoom: number, centerX?: number, centerY?: number) {
            const minZoom = fitZoom;
            const clampedZoom = Math.max(minZoom, Math.min(ZOOM_MAX, newZoom));
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

        fitToScreen() {
            fitZoom = calculateFitZoom();
            const position = calculateFitPosition(fitZoom);
            viewport = { ...viewport, x: position.x, y: position.y, zoom: fitZoom };
        },

        resetViewport() {
            fitZoom = calculateFitZoom();
            const position = calculateFitPosition(fitZoom);
            viewport = { ...viewport, x: position.x, y: position.y, zoom: fitZoom };
        }
    };
}

export const treeViewState = createTreeViewState();
