export type GestureType = 'none' | 'pan' | 'pinch';

export interface GestureState {
	type: GestureType;
	initialDistance: number;
	initialZoom: number;
	initialCenter: { x: number; y: number };
	lastCenter: { x: number; y: number };
}

export interface GestureCallbacks {
	onPan: (deltaX: number, deltaY: number) => void;
	onZoom: (newZoom: number, centerX: number, centerY: number) => void;
}

export function createGestureHandler(callbacks: GestureCallbacks) {
	let state: GestureState = {
		type: 'none',
		initialDistance: 0,
		initialZoom: 1,
		initialCenter: { x: 0, y: 0 },
		lastCenter: { x: 0, y: 0 }
	};

	let activeTouches: Map<number, Touch> = new Map();

	function getDistance(touch1: Touch, touch2: Touch): number {
		const dx = touch1.clientX - touch2.clientX;
		const dy = touch1.clientY - touch2.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function getCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
		return {
			x: (touch1.clientX + touch2.clientX) / 2,
			y: (touch1.clientY + touch2.clientY) / 2
		};
	}

	function handleTouchStart(event: TouchEvent, currentZoom: number, containerRect: DOMRect) {
		for (const touch of event.changedTouches) {
			activeTouches.set(touch.identifier, touch);
		}

		if (activeTouches.size === 2) {
			const touches = Array.from(activeTouches.values());
			const [touch1, touch2] = touches;

			state = {
				type: 'pinch',
				initialDistance: getDistance(touch1, touch2),
				initialZoom: currentZoom,
				initialCenter: getCenter(touch1, touch2),
				lastCenter: getCenter(touch1, touch2)
			};
		} else if (activeTouches.size === 1) {
			const touch = Array.from(activeTouches.values())[0];
			if (!touch) return;
			state = {
				type: 'pan',
				initialDistance: 0,
				initialZoom: currentZoom,
				initialCenter: { x: touch.clientX, y: touch.clientY },
				lastCenter: { x: touch.clientX, y: touch.clientY }
			};
		}
	}

	function handleTouchMove(event: TouchEvent, containerRect: DOMRect) {
		for (const touch of event.changedTouches) {
			activeTouches.set(touch.identifier, touch);
		}

		if (state.type === 'pinch' && activeTouches.size >= 2) {
			const touches = Array.from(activeTouches.values());
			const [touch1, touch2] = touches;

			const currentDistance = getDistance(touch1, touch2);
			const currentCenter = getCenter(touch1, touch2);

			const scale = currentDistance / state.initialDistance;
			const newZoom = state.initialZoom * scale;

			const centerX = currentCenter.x - containerRect.left;
			const centerY = currentCenter.y - containerRect.top;

			callbacks.onZoom(newZoom, centerX, centerY);

			const panDeltaX = currentCenter.x - state.lastCenter.x;
			const panDeltaY = currentCenter.y - state.lastCenter.y;
			if (Math.abs(panDeltaX) > 1 || Math.abs(panDeltaY) > 1) {
				callbacks.onPan(panDeltaX, panDeltaY);
			}

			state.lastCenter = currentCenter;
		} else if (state.type === 'pan' && activeTouches.size === 1) {
			const touch = Array.from(activeTouches.values())[0];
			if (!touch) return;

			const deltaX = touch.clientX - state.lastCenter.x;
			const deltaY = touch.clientY - state.lastCenter.y;

			callbacks.onPan(deltaX, deltaY);

			state.lastCenter = { x: touch.clientX, y: touch.clientY };
		}
	}

	function handleTouchEnd(event: TouchEvent, currentZoom: number) {
		for (const touch of event.changedTouches) {
			activeTouches.delete(touch.identifier);
		}

		if (activeTouches.size === 0) {
			state = {
				type: 'none',
				initialDistance: 0,
				initialZoom: currentZoom,
				initialCenter: { x: 0, y: 0 },
				lastCenter: { x: 0, y: 0 }
			};
		} else if (activeTouches.size === 1 && state.type === 'pinch') {
			const touch = Array.from(activeTouches.values())[0];
			if (!touch) return;
			state = {
				type: 'pan',
				initialDistance: 0,
				initialZoom: currentZoom,
				initialCenter: { x: touch.clientX, y: touch.clientY },
				lastCenter: { x: touch.clientX, y: touch.clientY }
			};
		}
	}

	function reset() {
		activeTouches.clear();
		state = {
			type: 'none',
			initialDistance: 0,
			initialZoom: 1,
			initialCenter: { x: 0, y: 0 },
			lastCenter: { x: 0, y: 0 }
		};
	}

	return {
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		reset,
		get state() {
			return state;
		},
		get activeTouchCount() {
			return activeTouches.size;
		}
	};
}
