import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import type { TreeLayout, TreeNode, TreeConnection, Viewport } from '$lib/types/tree';
import type { Gender } from '$lib/types/api';

const COLORS = {
    nodeMale: 0x525f80,
    nodeFemale: 0x9a8a6c,
    nodeOther: 0x317876,
    nodeUnknown: 0x868e96,
    nodeBorder: 0x343a40,
    nodeSelected: 0x66789b,
    nodeParent: 0x2d9a5d,
    nodeChild: 0xc96b2e,
    connectionLine: 0xadb5bd,
    connectionHighlight: 0x4a90d9,
    textPrimary: 0xffffff,
    textSecondary: 0xf1f3f5,
    background: 0xf8f9fa
};

function getNodeColor(gender: Gender): number {
    switch (gender) {
        case 'Male': return COLORS.nodeMale;
        case 'Female': return COLORS.nodeFemale;
        case 'Other': return COLORS.nodeOther;
        default: return COLORS.nodeUnknown;
    }
}

export interface TreeRendererOptions {
    onNodeClick?: (nodeId: string) => void;
}

export class TreeRenderer {
    private app: Application | null = null;
    private treeContainer: Container | null = null;
    private nodeSprites: Map<string, Container> = new Map();
    private layout: TreeLayout | null = null;
    private options: TreeRendererOptions;
    private selectedNodeId: string | null = null;
    private highlightedParentIds: Set<string> = new Set();
    private highlightedChildIds: Set<string> = new Set();

    constructor(options: TreeRendererOptions = {}) {
        this.options = options;
    }

    async initialize(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
        this.app = new Application();

        await this.app.init({
            canvas,
            width,
            height,
            backgroundColor: COLORS.background,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        this.treeContainer = new Container();
        this.app.stage.addChild(this.treeContainer);
    }

    render(layout: TreeLayout): void {
        if (!this.app || !this.treeContainer) return;

        this.layout = layout;
        this.treeContainer.removeChildren();
        this.nodeSprites.clear();

        this.renderConnections(layout);

        for (const node of layout.nodes.values()) {
            this.renderNode(node);
        }
    }

    private renderConnections(layout: TreeLayout): void {
        if (!this.treeContainer) return;

        const graphics = new Graphics();
        this.treeContainer.addChild(graphics);

        for (const connection of layout.connections) {
            if (connection.type === 'spouse') {
                this.drawSpouseConnection(graphics, connection, layout);
            } else {
                this.drawParentChildConnection(graphics, connection, layout);
            }
        }
    }

    private drawSpouseConnection(graphics: Graphics, connection: TreeConnection, layout: TreeLayout): void {
        const from = layout.nodes.get(connection.fromIds[0]);
        const to = layout.nodes.get(connection.toIds[0]);
        if (!from || !to) return;

        const sharedChildren = from.childIds.filter(childId => to.childIds.includes(childId));
        if (sharedChildren.length > 0) {
            return;
        }

        const y = from.position.y + from.height / 2;
        const x1 = from.position.x + from.width;
        const x2 = to.position.x;

        graphics.moveTo(x1, y);
        graphics.lineTo(x2, y);
        graphics.stroke({ width: 2, color: COLORS.connectionLine });
    }

    private drawParentChildConnection(graphics: Graphics, connection: TreeConnection, layout: TreeLayout): void {
        const parent = layout.nodes.get(connection.fromIds[0]);
        if (!parent) return;

        const parentBottomY = parent.position.y + parent.height;
        const parentCenterX = parent.position.x + parent.width / 2;

        for (const childId of connection.toIds) {
            const child = layout.nodes.get(childId);
            if (!child) continue;

            const childTopY = child.position.y;
            const childCenterX = child.position.x + child.width / 2;
            const midY = (parentBottomY + childTopY) / 2;

            const isHighlighted =
                (this.selectedNodeId === parent.id && this.highlightedChildIds.has(childId)) ||
                (this.selectedNodeId === childId && this.highlightedParentIds.has(parent.id));

            const lineColor = isHighlighted ? COLORS.connectionHighlight : COLORS.connectionLine;
            const lineWidth = isHighlighted ? 3 : 2;

            graphics.moveTo(parentCenterX, parentBottomY);
            graphics.lineTo(parentCenterX, midY);
            graphics.lineTo(childCenterX, midY);
            graphics.lineTo(childCenterX, childTopY);
            graphics.stroke({ width: lineWidth, color: lineColor });
        }
    }

    private renderNode(node: TreeNode): void {
        if (!this.treeContainer) return;

        const container = new Container();
        container.position.set(node.position.x, node.position.y);
        container.eventMode = 'static';
        container.cursor = 'pointer';

        const bg = new Graphics();
        const color = getNodeColor(node.person.gender);
        bg.roundRect(0, 0, node.width, node.height, 8);
        bg.fill(color);

        if (node.id === this.selectedNodeId) {
            bg.roundRect(0, 0, node.width, node.height, 8);
            bg.stroke({ width: 3, color: COLORS.nodeSelected });
        } else if (this.highlightedParentIds.has(node.id)) {
            bg.roundRect(0, 0, node.width, node.height, 8);
            bg.stroke({ width: 3, color: COLORS.nodeParent });
        } else if (this.highlightedChildIds.has(node.id)) {
            bg.roundRect(0, 0, node.width, node.height, 8);
            bg.stroke({ width: 3, color: COLORS.nodeChild });
        }

        container.addChild(bg);

        const displayName = this.formatName(node.person.firstName, node.person.lastName);
        const nameStyle = new TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: '600',
            fill: COLORS.textPrimary,
            wordWrap: true,
            wordWrapWidth: node.width - 16
        });
        const nameText = new Text({ text: displayName, style: nameStyle });
        nameText.position.set(8, 8);
        container.addChild(nameText);

        const years = this.formatYears(node.person.birthDate, node.person.deathDate);
        if (years) {
            const yearsStyle = new TextStyle({
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fill: COLORS.textSecondary
            });
            const yearsText = new Text({ text: years, style: yearsStyle });
            yearsText.position.set(8, node.height - 24);
            container.addChild(yearsText);
        }

        container.on('pointerdown', (event: FederatedPointerEvent) => {
            event.stopPropagation();
            this.options.onNodeClick?.(node.id);
        });

        this.treeContainer.addChild(container);
        this.nodeSprites.set(node.id, container);
    }

    private formatName(firstName: string | null, lastName: string | null): string {
        if (!firstName && !lastName) return 'Unknown Person';
        return [firstName, lastName].filter(Boolean).join(' ');
    }

    private formatYears(birthDate: string | null, deathDate: string | null): string | null {
        const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;
        const deathYear = deathDate ? new Date(deathDate).getFullYear() : null;

        if (!birthYear && !deathYear) return null;
        if (birthYear && deathYear) return `${birthYear} - ${deathYear}`;
        if (birthYear) return `b. ${birthYear}`;
        return `d. ${deathYear}`;
    }

    updateSelection(nodeId: string | null): void {
        this.selectedNodeId = nodeId;
        this.highlightedParentIds.clear();
        this.highlightedChildIds.clear();

        if (nodeId && this.layout) {
            const selectedNode = this.layout.nodes.get(nodeId);
            if (selectedNode) {
                for (const parentId of selectedNode.parentIds) {
                    this.highlightedParentIds.add(parentId);
                }
                for (const childId of selectedNode.childIds) {
                    this.highlightedChildIds.add(childId);
                }
            }
        }

        if (this.layout) {
            this.render(this.layout);
        }
    }

    updateViewport(viewport: Viewport): void {
        if (!this.treeContainer) return;

        this.treeContainer.position.set(
            viewport.width / 2 + viewport.x,
            viewport.height / 2 + viewport.y
        );
        this.treeContainer.scale.set(viewport.zoom);
    }

    resize(width: number, height: number): void {
        if (!this.app) return;
        this.app.renderer.resize(width, height);
    }

    destroy(): void {
        this.app?.destroy(true, { children: true, texture: true });
        this.app = null;
        this.treeContainer = null;
        this.nodeSprites.clear();
    }
}
