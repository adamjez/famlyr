import type { FamilyTreeModel, PersonModel } from '$lib/types/api';
import type { TreeLayout, Viewport, TreeNode, FoldState } from '$lib/types/tree';
import { ZOOM_MAX } from '$lib/types/tree';

const ANIMATION_DURATION = 300;

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

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
    let expandedNodeIds = $state<Set<string>>(new Set());

    let animationFrameId: number | null = null;

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

    function getRelatedNodeIds(personId: string): string[] {
        if (!layout) return [personId];

        const node = layout.nodes.get(personId);
        if (!node) return [personId];

        const relatedIds = new Set<string>();
        relatedIds.add(personId);

        for (const parentId of node.parentIds) {
            relatedIds.add(parentId);
        }

        for (const childId of node.childIds) {
            relatedIds.add(childId);
        }

        for (const spouseId of node.spouseIds) {
            relatedIds.add(spouseId);
        }

        return Array.from(relatedIds);
    }

    function calculateGroupBounds(nodeIds: string[]): { minX: number; maxX: number; minY: number; maxY: number } | null {
        if (!layout || nodeIds.length === 0) return null;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const nodeId of nodeIds) {
            const node = layout.nodes.get(nodeId);
            if (!node) continue;

            minX = Math.min(minX, node.position.x);
            maxX = Math.max(maxX, node.position.x + node.width);
            minY = Math.min(minY, node.position.y);
            maxY = Math.max(maxY, node.position.y + node.height);
        }

        if (minX === Infinity) return null;

        const padding = 50;
        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minY: minY - padding,
            maxY: maxY + padding
        };
    }

    function animateViewport(targetX: number, targetY: number, targetZoom: number) {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }

        const startX = viewport.x;
        const startY = viewport.y;
        const startZoom = viewport.zoom;
        const startTime = performance.now();

        function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
            const easedProgress = easeOutCubic(progress);

            const newX = startX + (targetX - startX) * easedProgress;
            const newY = startY + (targetY - startY) * easedProgress;
            const newZoom = startZoom + (targetZoom - startZoom) * easedProgress;

            viewport = {
                ...viewport,
                x: newX,
                y: newY,
                zoom: newZoom
            };

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                animationFrameId = null;
            }
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    function zoomToGroup(nodeIds: string[], animated: boolean = true) {
        if (viewport.width === 0 || viewport.height === 0) return;

        const bounds = calculateGroupBounds(nodeIds);
        if (!bounds) return;

        const groupWidth = bounds.maxX - bounds.minX;
        const groupHeight = bounds.maxY - bounds.minY;

        const zoomX = viewport.width / groupWidth;
        const zoomY = viewport.height / groupHeight;
        const targetZoom = Math.min(zoomX, zoomY) * 0.9;

        const clampedZoom = Math.max(fitZoom, Math.min(ZOOM_MAX, targetZoom));

        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        const targetX = -centerX * clampedZoom;
        const targetY = -centerY * clampedZoom;

        if (animated) {
            animateViewport(targetX, targetY, clampedZoom);
        } else {
            viewport = {
                ...viewport,
                x: targetX,
                y: targetY,
                zoom: clampedZoom
            };
        }
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
        get expandedNodeIds() { return expandedNodeIds; },

        setTree(newTree: FamilyTreeModel) {
            tree = newTree;
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
            if (personId === focusedPersonId) return;
            focusedPersonId = personId;
            expandedNodeIds = new Set();
        },

        zoomToFocusedPerson() {
            if (!focusedPersonId) return;
            const relatedIds = getRelatedNodeIds(focusedPersonId);
            zoomToGroup(relatedIds, true);
        },

        fitToScreen() {
            fitZoom = calculateFitZoom();
            const position = calculateFitPosition(fitZoom);
            viewport = { ...viewport, x: position.x, y: position.y, zoom: fitZoom };
        },

        resetViewport() {
            fitZoom = calculateFitZoom();
            const position = calculateFitPosition(fitZoom);
            animateViewport(position.x, position.y, fitZoom);
        },

        toggleNodeExpanded(nodeId: string) {
            const newSet = new Set(expandedNodeIds);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            expandedNodeIds = newSet;
        },

        expandNode(nodeId: string) {
            if (!expandedNodeIds.has(nodeId)) {
                const newSet = new Set(expandedNodeIds);
                newSet.add(nodeId);
                expandedNodeIds = newSet;
            }
        },

        collapseNode(nodeId: string) {
            if (expandedNodeIds.has(nodeId)) {
                const newSet = new Set(expandedNodeIds);
                newSet.delete(nodeId);
                expandedNodeIds = newSet;
            }
        },

        expandAllAtLayer(layer: number) {
            if (!layout) return;
            const newSet = new Set(expandedNodeIds);
            for (const node of layout.nodes.values()) {
                if (node.layer === layer && node.descendantCount > 0) {
                    newSet.add(node.id);
                }
            }
            expandedNodeIds = newSet;
        },

        collapseAllAtLayer(layer: number) {
            if (!layout) return;
            const newSet = new Set(expandedNodeIds);
            for (const node of layout.nodes.values()) {
                if (node.layer === layer) {
                    newSet.delete(node.id);
                }
            }
            expandedNodeIds = newSet;
        },

        resetFoldState(focusLineageIds: string[]) {
            expandedNodeIds = new Set(focusLineageIds);
        },

        isNodeExpanded(nodeId: string): boolean {
            return expandedNodeIds.has(nodeId);
        }
    };
}

export const treeViewState = createTreeViewState();
