import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent, Sprite, Texture, Assets } from 'pixi.js';
import type { TreeLayout, TreeNode, TreeConnection, Viewport, LODLevel, FamilyNode } from '$lib/types/tree';
import { LOD_CONFIGS } from '$lib/types/tree';
import type { Gender, PersonModel } from '$lib/types/api';

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
    onFoldToggle?: (nodeId: string) => void;
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
    private photoTextures: Map<string, Texture> = new Map();
    private photoContainers: Map<string, Container> = new Map();
    private currentLOD: LODLevel = 3;

    constructor(options: TreeRendererOptions = {}) {
        this.options = options;
    }

    setLOD(lod: LODLevel): void {
        this.currentLOD = lod;
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
        this.photoContainers.clear();

        this.renderConnections(layout);

        for (const node of layout.nodes.values()) {
            if (node.isVisible) {
                this.renderNode(node);
            }
        }
    }

    private renderConnections(layout: TreeLayout): void {
        if (!this.treeContainer) return;

        const graphics = new Graphics();
        this.treeContainer.addChild(graphics);

        if (layout.familyNodes.size > 0) {
            this.drawFamilyNodeConnections(graphics, layout);
        }

        for (const connection of layout.connections) {
            if (connection.type === 'spouse') {
                this.drawSpouseConnection(graphics, connection, layout);
            } else if (connection.type === 'coparent') {
                this.drawCoParentConnection(graphics, connection, layout);
            } else if (layout.familyNodes.size === 0) {
                this.drawParentChildConnection(graphics, connection, layout);
            }
        }
    }

    private drawFamilyNodeConnections(graphics: Graphics, layout: TreeLayout): void {
        for (const familyNode of layout.familyNodes.values()) {
            const parentCenters = familyNode.parentIds
                .map(id => {
                    const node = layout.nodes.get(id);
                    if (!node || !node.isVisible) return null;
                    return {
                        x: node.position.x + node.width / 2,
                        y: node.position.y + node.height
                    };
                })
                .filter((p): p is { x: number; y: number } => p !== null);

            if (parentCenters.length === 0) continue;

            const familyX = familyNode.position.x;
            const familyY = familyNode.position.y;

            if (parentCenters.length === 2) {
                const [p1, p2] = parentCenters;
                const lineY = p1.y + (familyY - p1.y) * 0.3;

                graphics.moveTo(p1.x, p1.y);
                graphics.lineTo(p1.x, lineY);
                graphics.stroke({ width: 2, color: COLORS.connectionLine });

                graphics.moveTo(p2.x, p2.y);
                graphics.lineTo(p2.x, lineY);
                graphics.stroke({ width: 2, color: COLORS.connectionLine });

                graphics.moveTo(p1.x, lineY);
                graphics.lineTo(p2.x, lineY);
                graphics.stroke({ width: 2, color: COLORS.connectionLine });

                const midX = (p1.x + p2.x) / 2;
                graphics.moveTo(midX, lineY);
                graphics.lineTo(familyX, familyY);
                graphics.stroke({ width: 2, color: COLORS.connectionLine });
            } else {
                graphics.moveTo(parentCenters[0].x, parentCenters[0].y);
                graphics.lineTo(familyX, familyY);
                graphics.stroke({ width: 2, color: COLORS.connectionLine });
            }

            const childCenters = familyNode.childIds
                .map(id => {
                    const node = layout.nodes.get(id);
                    if (!node || !node.isVisible) return null;
                    return {
                        id,
                        x: node.position.x + node.width / 2,
                        y: node.position.y
                    };
                })
                .filter((c): c is { id: string; x: number; y: number } => c !== null);

            if (childCenters.length === 0) continue;

            const minChildX = Math.min(...childCenters.map(c => c.x));
            const maxChildX = Math.max(...childCenters.map(c => c.x));

            const railMinX = Math.min(familyX, minChildX);
            const railMaxX = Math.max(familyX, maxChildX);

            if (childCenters.length > 1 || Math.abs(familyX - childCenters[0].x) > 1) {
                graphics.moveTo(railMinX, familyY);
                graphics.lineTo(railMaxX, familyY);
                graphics.stroke({ width: 2, color: COLORS.connectionLine });
            }

            for (const child of childCenters) {
                const isHighlighted =
                    this.highlightedChildIds.has(child.id) ||
                    familyNode.parentIds.some(pid => this.highlightedParentIds.has(pid));

                const lineColor = isHighlighted ? COLORS.connectionHighlight : COLORS.connectionLine;
                const lineWidth = isHighlighted ? 3 : 2;

                graphics.moveTo(child.x, familyY);
                graphics.lineTo(child.x, child.y);
                graphics.stroke({ width: lineWidth, color: lineColor });
            }
        }
    }

    private drawSpouseConnection(graphics: Graphics, connection: TreeConnection, layout: TreeLayout): void {
        const from = layout.nodes.get(connection.fromIds[0]);
        const to = layout.nodes.get(connection.toIds[0]);
        if (!from || !to) return;

        // Only skip spouse line if they have VISIBLE shared children
        // (if children are folded/hidden, we need the spouse line to show the relationship)
        const sharedChildren = from.childIds.filter(childId => to.childIds.includes(childId));
        const visibleSharedChildren = sharedChildren.filter(childId => {
            const childNode = layout.nodes.get(childId);
            return childNode?.isVisible;
        });
        if (visibleSharedChildren.length > 0) {
            return;
        }

        const y = from.position.y + from.height / 2;
        const x1 = from.position.x + from.width;
        const x2 = to.position.x;

        graphics.moveTo(x1, y);
        graphics.lineTo(x2, y);
        graphics.stroke({ width: 2, color: COLORS.connectionLine });
    }

    private drawCoParentConnection(graphics: Graphics, connection: TreeConnection, layout: TreeLayout): void {
        const from = layout.nodes.get(connection.fromIds[0]);
        const to = layout.nodes.get(connection.toIds[0]);
        if (!from || !to) return;

        // Only skip line if they have VISIBLE shared children
        const sharedChildren = from.childIds.filter(childId => to.childIds.includes(childId));
        const visibleSharedChildren = sharedChildren.filter(childId => {
            const childNode = layout.nodes.get(childId);
            return childNode?.isVisible;
        });
        if (visibleSharedChildren.length > 0) {
            return;
        }

        const y = from.position.y + from.height / 2;
        const x1 = from.position.x + from.width;
        const x2 = to.position.x;

        // Draw dashed line for co-parents (visually distinct from spouse solid line)
        const dashLength = 6;
        const gapLength = 4;
        let currentX = x1;

        while (currentX < x2) {
            const endX = Math.min(currentX + dashLength, x2);
            graphics.moveTo(currentX, y);
            graphics.lineTo(endX, y);
            graphics.stroke({ width: 2, color: COLORS.connectionLine });
            currentX = endX + gapLength;
        }
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

        // Render based on current LOD
        switch (this.currentLOD) {
            case 1:
                this.renderNodeLOD1(container, node);
                break;
            case 2:
                this.renderNodeLOD2(container, node);
                break;
            case 3:
            default:
                this.renderNodeLOD3(container, node);
                break;
        }

        container.on('pointerdown', (event: FederatedPointerEvent) => {
            event.stopPropagation();
            this.options.onNodeClick?.(node.id);
        });

        this.treeContainer.addChild(container);
        this.nodeSprites.set(node.id, container);
    }

    private renderNodeLOD1(container: Container, node: TreeNode): void {
        // Simple colored rectangle at LOD 1
        const bg = new Graphics();
        const color = getNodeColor(node.person.gender);
        bg.roundRect(0, 0, node.width, node.height, 2);
        bg.fill(color);

        if (node.id === this.selectedNodeId) {
            bg.roundRect(0, 0, node.width, node.height, 2);
            bg.stroke({ width: 2, color: COLORS.nodeSelected });
        } else if (this.highlightedParentIds.has(node.id)) {
            bg.roundRect(0, 0, node.width, node.height, 2);
            bg.stroke({ width: 2, color: COLORS.nodeParent });
        } else if (this.highlightedChildIds.has(node.id)) {
            bg.roundRect(0, 0, node.width, node.height, 2);
            bg.stroke({ width: 2, color: COLORS.nodeChild });
        }

        container.addChild(bg);
    }

    private renderNodeLOD2(container: Container, node: TreeNode): void {
        // Medium detail - name + years
        const lodConfig = LOD_CONFIGS[2];
        const bg = new Graphics();
        const color = getNodeColor(node.person.gender);
        bg.roundRect(0, 0, node.width, node.height, 4);
        bg.fill(color);

        if (node.id === this.selectedNodeId) {
            bg.roundRect(0, 0, node.width, node.height, 4);
            bg.stroke({ width: 2, color: COLORS.nodeSelected });
        } else if (this.highlightedParentIds.has(node.id)) {
            bg.roundRect(0, 0, node.width, node.height, 4);
            bg.stroke({ width: 2, color: COLORS.nodeParent });
        } else if (this.highlightedChildIds.has(node.id)) {
            bg.roundRect(0, 0, node.width, node.height, 4);
            bg.stroke({ width: 2, color: COLORS.nodeChild });
        }

        container.addChild(bg);

        // Truncated name
        let displayName = this.formatName(node.person.firstName, node.person.lastName);
        if (lodConfig.truncateName && displayName.length > lodConfig.truncateName) {
            displayName = displayName.substring(0, lodConfig.truncateName - 1) + '…';
        }
        const nameStyle = new TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fontWeight: '600',
            fill: COLORS.textPrimary
        });
        const nameText = new Text({ text: displayName, style: nameStyle });
        nameText.position.set(4, 4);
        container.addChild(nameText);

        // Birth year only
        const birthYear = node.person.birthDate ? new Date(node.person.birthDate).getFullYear() : null;
        if (birthYear) {
            const yearsStyle = new TextStyle({
                fontFamily: 'Inter, sans-serif',
                fontSize: 9,
                fill: COLORS.textSecondary
            });
            const yearsText = new Text({ text: String(birthYear), style: yearsStyle });
            yearsText.position.set(4, node.height - 14);
            container.addChild(yearsText);
        }
    }

    private renderNodeLOD3(container: Container, node: TreeNode): void {
        // Full detail with photo
        const lodConfig = LOD_CONFIGS[3];
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

        // Photo or avatar
        const photoSize = 40;
        const photoX = 8;
        const photoY = (node.height - photoSize) / 2;

        if (lodConfig.showPhoto) {
            const photoContainer = new Container();
            photoContainer.position.set(photoX, photoY);
            container.addChild(photoContainer);
            this.photoContainers.set(node.person.id, photoContainer);

            if (node.person.primaryPhotoUrl) {
                this.renderPhoto(photoContainer, node.person, 0, 0, photoSize);
            } else {
                this.renderPlaceholderAvatar(photoContainer, node.person, 0, 0, photoSize);
            }
        }

        // Text positioning (shifted right if photo shown)
        const textX = lodConfig.showPhoto ? photoX + photoSize + 8 : 8;
        const textWidth = node.width - textX - 8;

        // Name
        const nameY = 10;
        const displayName = this.formatName(node.person.firstName, node.person.lastName);
        const nameStyle = new TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: '600',
            fill: COLORS.textPrimary,
            wordWrap: true,
            wordWrapWidth: textWidth
        });
        const nameText = new Text({ text: displayName, style: nameStyle });
        nameText.position.set(textX, nameY);
        container.addChild(nameText);

        // Years - positioned below name text
        const years = this.formatYears(node.person.birthDate, node.person.deathDate);
        if (years) {
            const yearsY = nameY + nameText.height + 2;
            const yearsStyle = new TextStyle({
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                fill: COLORS.textSecondary
            });
            const yearsText = new Text({ text: years, style: yearsStyle });
            yearsText.position.set(textX, yearsY);
            container.addChild(yearsText);
        }

        // Fold indicator
        if (node.descendantCount > 0) {
            this.renderFoldIndicator(container, node);
        }
    }

    private renderPhoto(container: Container, person: PersonModel, x: number, y: number, size: number): void {
        if (!person.primaryPhotoUrl) return;

        // Check if texture is already loaded
        const cachedTexture = this.photoTextures.get(person.id);
        if (cachedTexture) {
            // Texture is already loaded, render it
            this.renderPhotoSprite(container, cachedTexture, x, y, size);
            return;
        }

        // Show placeholder while loading
        this.renderPlaceholderAvatar(container, person, x, y, size);

        // Load texture asynchronously
        const photoUrl = person.primaryPhotoUrl;
        const personId = person.id;
        Assets.load(photoUrl).then((texture: Texture) => {
            this.photoTextures.set(personId, texture);
            // Targeted update: only update this node's photo container
            const photoContainer = this.photoContainers.get(personId);
            if (photoContainer && this.currentLOD === 3) {
                photoContainer.removeChildren();
                this.renderPhotoSprite(photoContainer, texture, 0, 0, size);
            }
        }).catch(() => {
            // Failed to load, placeholder remains
        });
    }

    private renderPhotoSprite(container: Container, texture: Texture, x: number, y: number, size: number): void {
        // Create circular mask
        const mask = new Graphics();
        mask.circle(x + size / 2, y + size / 2, size / 2);
        mask.fill(0xffffff);
        container.addChild(mask);

        // Create sprite with "cover" behavior (fill circle, maintain aspect ratio)
        const sprite = new Sprite(texture);
        const textureWidth = texture.width;
        const textureHeight = texture.height;

        if (textureWidth > 0 && textureHeight > 0) {
            const aspectRatio = textureWidth / textureHeight;

            if (aspectRatio > 1) {
                // Wider than tall - fit height, crop width
                sprite.height = size;
                sprite.width = size * aspectRatio;
                sprite.position.set(x - (sprite.width - size) / 2, y);
            } else {
                // Taller than wide - fit width, crop height
                sprite.width = size;
                sprite.height = size / aspectRatio;
                sprite.position.set(x, y - (sprite.height - size) / 2);
            }
        } else {
            // Fallback if texture dimensions not available
            sprite.width = size;
            sprite.height = size;
            sprite.position.set(x, y);
        }

        sprite.mask = mask;
        container.addChild(sprite);
    }

    private renderPlaceholderAvatar(container: Container, person: PersonModel, x: number, y: number, size: number): void {
        // Background circle
        const avatarBg = new Graphics();
        const color = getNodeColor(person.gender);
        avatarBg.circle(x + size / 2, y + size / 2, size / 2);
        avatarBg.fill(color);
        avatarBg.stroke({ width: 2, color: 0xffffff });
        container.addChild(avatarBg);

        // Initials
        const initials = this.getInitials(person.firstName, person.lastName);
        const initialsStyle = new TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: size * 0.35,
            fontWeight: '600',
            fill: 0xffffff
        });
        const initialsText = new Text({ text: initials, style: initialsStyle });
        initialsText.anchor.set(0.5);
        initialsText.position.set(x + size / 2, y + size / 2);
        container.addChild(initialsText);
    }

    private getInitials(firstName: string | null, lastName: string | null): string {
        const first = firstName?.[0] ?? '';
        const last = lastName?.[0] ?? '';
        return (first + last).toUpperCase() || '?';
    }

    private renderFoldIndicator(container: Container, node: TreeNode): void {
        const indicator = new Container();
        indicator.position.set(node.width - 40, node.height - 24);
        indicator.eventMode = 'static';
        indicator.cursor = 'pointer';

        // Explicit hit area for better click detection
        const hitArea = new Graphics();
        hitArea.rect(0, 0, 36, 22);
        hitArea.fill(0x000000);
        hitArea.alpha = 0.01; // Nearly invisible but clickable
        indicator.addChild(hitArea);

        const bg = new Graphics();
        bg.roundRect(2, 2, 32, 18, 4);
        bg.fill(0x000000);
        bg.alpha = 0.3;
        indicator.addChild(bg);

        const triangle = new Graphics();
        if (node.isCollapsed) {
            // Right-pointing triangle (collapsed)
            triangle.moveTo(6, 7);
            triangle.lineTo(14, 11);
            triangle.lineTo(6, 15);
            triangle.closePath();
        } else {
            // Down-pointing triangle (expanded)
            triangle.moveTo(6, 8);
            triangle.lineTo(14, 8);
            triangle.lineTo(10, 14);
            triangle.closePath();
        }
        triangle.fill(0xffffff);
        indicator.addChild(triangle);

        const countText = node.descendantCount > 99 ? '99+' : String(node.descendantCount);
        const countStyle = new TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fontWeight: '600',
            fill: 0xffffff
        });
        const countLabel = new Text({ text: countText, style: countStyle });
        countLabel.position.set(16, 5);
        indicator.addChild(countLabel);

        indicator.on('pointerdown', (event: FederatedPointerEvent) => {
            event.stopPropagation();
            this.options.onFoldToggle?.(node.id);
        });

        container.addChild(indicator);
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
        // Clean up photo textures
        for (const texture of this.photoTextures.values()) {
            texture.destroy();
        }
        this.photoTextures.clear();

        this.app?.destroy(true, { children: true, texture: true });
        this.app = null;
        this.treeContainer = null;
        this.nodeSprites.clear();
    }
}
