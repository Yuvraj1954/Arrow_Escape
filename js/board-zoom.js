/**
 * Pinch / wheel zoom and pan for the puzzle layer only.
 * Outer .board-wrap size never changes; .board-transform scales inside .board-viewport.
 */
const BoardZoom = (() => {
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 4.0;
    const LOAD_ANIM_MS = 300;
    const ZOOM_SENSITIVITY = 0.004;

    let active = null;

    function destroy() {
        console.log("board-zoom.js: destroy() called");
        if (!active) return;
        const { viewport, transform, handlers } = active;
        
        // CLEAR ALL TRANSFORMS FROM transform EL!
        console.log("board-zoom.js: destroy() clearing transform from transformEl");
        if (transform) {
            console.log("  BEFORE clear: transform.style.transform =", JSON.stringify(transform.style.transform));
            transform.style.transform = "";
            transform.style.transformOrigin = "";
            console.log("  AFTER clear: transform.style.transform =", JSON.stringify(transform.style.transform));
        }
        
        if (viewport && handlers) {
            if (handlers.wheel) viewport.removeEventListener("wheel", handlers.wheel);
            if (handlers.pointerdown) viewport.removeEventListener("pointerdown", handlers.pointerdown);
            if (handlers.pointermove) viewport.removeEventListener("pointermove", handlers.pointermove);
            if (handlers.pointerup) viewport.removeEventListener("pointerup", handlers.pointerup);
            if (handlers.pointercancel) viewport.removeEventListener("pointercancel", handlers.pointerup);
            if (handlers.dblclick) viewport.removeEventListener("dblclick", handlers.dblclick);
            if (handlers.touchstart) viewport.removeEventListener("touchstart", handlers.touchstart);
            if (handlers.touchmove) viewport.removeEventListener("touchmove", handlers.touchmove);
            if (handlers.touchend) viewport.removeEventListener("touchend", handlers.touchend);
        }
        active = null;
    }

    function measureContent(contentEl) {
        console.log("board-zoom.js: measureContent() called, contentEl =", contentEl);
        const svg = contentEl.querySelector(".arrow-maze-svg");
        console.log("  svg =", svg);
        if (svg) {
            console.log("  svg.getAttribute('viewBox') =", svg.getAttribute("viewBox"));
            console.log("  svg.width =", svg.width, "svg.height =", svg.height);
            console.log("  svg.style.width =", svg.style.width, "svg.style.height =", svg.style.height);
        }
        console.log("  contentEl.offsetWidth =", contentEl.offsetWidth);
        console.log("  contentEl.offsetHeight =", contentEl.offsetHeight);
        console.log("  contentEl.getBoundingClientRect() =", contentEl.getBoundingClientRect());
        return {
            w: contentEl.offsetWidth,
            h: contentEl.offsetHeight
        };
    }

    function getArrowCells(a) {
        if (a.cells) return a.cells;
        let cells = [];
        if (a.body) {
            cells = a.body.map(c => [c.row, c.col]);
        }
        if (a.head) {
            cells.push([a.head.row, a.head.col]);
        }
        return cells;
    }

    function getArrowBounds(level) {
        let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
        if (level && level.arrows && level.arrows.length > 0) {
            level.arrows.forEach(a => {
                let arrowCells = a.cells;
                if (!arrowCells) {
                    arrowCells = (a.body || []).map(c => [c.row, c.col]);
                    if (a.head) arrowCells.push([a.head.row, a.head.col]);
                }
                arrowCells.forEach(([r, c]) => {
                    if (r < minR) minR = r;
                    if (r > maxR) maxR = r;
                    if (c < minC) minC = c;
                    if (c > maxC) maxC = c;
                });
            });
        }
        return { minR, maxR, minC, maxC };
    }

    function getShapeMetrics(contentEl, level) {
        const { w, h } = measureContent(contentEl);
        
        let boundsMinCol = level?.shapeMask?.bounds?.minX || 0;
        let boundsMinRow = level?.shapeMask?.bounds?.minY || 0;
        
        const pad = 24;
        const cellSize = 50;
        
        let { minR, maxR, minC, maxC } = getArrowBounds(level);
        
        if (minR === Infinity) {
            return { w, h, centerX: w / 2, centerY: h / 2, shapeWidth: w, shapeHeight: h };
        }
        
        let shapeX1 = pad + (minC - boundsMinCol) * cellSize;
        let shapeY1 = pad + (minR - boundsMinRow) * cellSize;
        let shapeX2 = pad + (maxC - boundsMinCol + 1) * cellSize;
        let shapeY2 = pad + (maxR - boundsMinRow + 1) * cellSize;
        
        return {
            w, h,
            centerX: (shapeX1 + shapeX2) / 2,
            centerY: (shapeY1 + shapeY2) / 2,
            shapeWidth: shapeX2 - shapeX1,
            shapeHeight: shapeY2 - shapeY1
        };
    }

    function computeFitScale(viewport, contentEl, level, marginScale = 0.65) {
        console.log("board-zoom.js: computeFitScale() called");
        const vpW = viewport.clientWidth;
        const vpH = viewport.clientHeight;
        const metrics = getShapeMetrics(contentEl, level);
        
        if (!vpW || !vpH || !metrics.shapeWidth || !metrics.shapeHeight) return 1;

        let scale = Math.min(vpW / metrics.shapeWidth, vpH / metrics.shapeHeight);
        scale *= marginScale; // Apply the padding margin

        console.log("  final scale before clamp =", scale);
        return Math.max(MIN_ZOOM, Math.min(scale, MAX_ZOOM));
    }

    function centerOffset(viewport, contentEl, level, scale) {
        console.log("board-zoom.js: centerOffset() called");
        const vpW = viewport.clientWidth;
        const vpH = viewport.clientHeight;
        const metrics = getShapeMetrics(contentEl, level);
        
        const offset = {
            tx: (vpW / 2) - (metrics.centerX * scale),
            ty: (vpH / 2) - (metrics.centerY * scale)
        };
        console.log("board-zoom.js: centerOffset returning tx =", offset.tx, ", ty =", offset.ty);
        return offset;
    }

    function applyTransform(transform, scale, tx, ty, animate) {
        console.log("board-zoom.js: applyTransform() called with scale =", scale, ", tx =", tx, ", ty =", ty);
        transform.style.transformOrigin = "0 0";
        if (animate) {
            transform.classList.add("board-transform--animate");
        } else {
            transform.classList.remove("board-transform--animate");
        }
        transform.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    function clientToContent(viewport, contentEl, clientX, clientY, scale, tx, ty) {
        console.log("board-zoom.js: clientToContent() called");
        const vr = viewport.getBoundingClientRect();
        const localX = clientX - vr.left;
        const localY = clientY - vr.top;
        return {
            x: (localX - tx) / scale,
            y: (localY - ty) / scale
        };
    }

    function zoomAtPoint(state, newUserZoom, clientX, clientY) {
        console.log("board-zoom.js: zoomAtPoint() called");
        const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newUserZoom));
        const oldScale = state.fitScale * state.userZoom;
        const newScale = state.fitScale * clamped;
        const pt = clientToContent(
            state.viewport,
            state.contentEl,
            clientX,
            clientY,
            oldScale,
            state.tx,
            state.ty
        );
        state.userZoom = clamped;
        state.tx = clientX - state.viewport.getBoundingClientRect().left - pt.x * newScale;
        state.ty = clientY - state.viewport.getBoundingClientRect().top - pt.y * newScale;
        applyTransform(state.transform, newScale, state.tx, state.ty, false);
    }

    function resetToDefault(state, animate) {
        console.log("board-zoom.js: resetToDefault() called");
        state.userZoom = 1;
        const scale = state.fitScale;
        const c = centerOffset(state.viewport, state.contentEl, state.level, scale);
        state.tx = c.tx;
        state.ty = c.ty;
        applyTransform(state.transform, scale, state.tx, state.ty, animate);
    }

    function fitBoardToScreen(level) {
        console.log("board-zoom.js: fitBoardToScreen() called");
        if (!active) return;
        const state = active.state;
        state.level = level || state.level;
        
        // Recalculate everything from scratch
        state.userZoom = 1;
        
        const containerWidth = state.viewport.clientWidth;
        const containerHeight = state.viewport.clientHeight;
        
        const { w: boardWidth, h: boardHeight } = measureContent(state.contentEl);
        
        const currentTransform = state.transform.style.transform;
        
        state.fitScale = computeFitScale(state.viewport, state.contentEl, state.level);
        
        console.log("containerWidth", containerWidth);
        console.log("containerHeight", containerHeight);
        console.log("computedScale", state.fitScale);
        console.log("currentTransform", currentTransform);
        
        const c = centerOffset(state.viewport, state.contentEl, state.level, state.fitScale);
        state.tx = c.tx;
        state.ty = c.ty;
        
        // Debug logs
        console.log("Level loaded");
        console.log("Board width:", boardWidth);
        console.log("Board height:", boardHeight);
        console.log("Calculated scale:", state.fitScale);
        console.log("Board center X:", state.tx);
        console.log("Board center Y:", state.ty);
        
        applyTransform(state.transform, state.fitScale, state.tx, state.ty, false);
    }

    function init(wrap, transformEl, level) {
        console.log("board-zoom.js: init() called with level.id =", level?.id);
        destroy();

        const viewport = wrap.querySelector(".board-viewport");
        const contentEl = transformEl;
        console.log("board-zoom.js: init initial viewport.clientWidth=", viewport?.clientWidth, "viewport.clientHeight=", viewport?.clientHeight);
        if (!viewport || !contentEl) return null;

        const state = {
            wrap,
            viewport,
            transform: transformEl,
            contentEl,
            level,
            fitScale: 1,
            userZoom: 1,
            tx: 0,
            ty: 0,
            panning: false,
            panStart: null,
            pinchStartDist: null,
            pinchStartZoom: null,
            pinchStartMid: null,
            pinchStartTx: null,
            pinchStartTy: null,
            lastTap: 0,
            suppressClick: false
        };

        // Fit board immediately to prevent FOUC (first frame correct)
        fitBoardToScreen(level);

        // Also schedule a double rAF to catch any layout shifts
        console.log("board-zoom.js: init scheduling double rAF for fit");
        requestAnimationFrame(() => {
            console.log("board-zoom.js: first rAF in init");
            requestAnimationFrame(() => {
                console.log("board-zoom.js: second rAF in init, calling fitBoardToScreen");
                fitBoardToScreen(level);
            });
        });

        // Unified Pointer Events Map for Pan & Zoom
        const activePointers = new Map();

        const handlers = {
            wheel: (e) => {
                e.preventDefault();
                const delta = -e.deltaY * ZOOM_SENSITIVITY;
                zoomAtPoint(state, state.userZoom + delta, e.clientX, e.clientY);
            },
            pointerdown: (e) => {
                // Left mouse button or touches only
                if (e.button && e.button !== 0) return;
                
                activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                
                state.panning = true;
                state.suppressClick = false;
                state.panStart = { x: e.clientX, y: e.clientY };
                state.initialTx = state.tx;
                state.initialTy = state.ty;
                
                if (activePointers.size === 2) {
                    const pts = Array.from(activePointers.values());
                    state.pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                    state.pinchStartZoom = state.userZoom;
                    state.pinchStartMid = {
                        x: (pts[0].x + pts[1].x) / 2,
                        y: (pts[0].y + pts[1].y) / 2
                    };
                    state.pinchStartTx = state.tx;
                    state.pinchStartTy = state.ty;
                }
            },
            pointermove: (e) => {
                if (!state.panning) return;
                
                activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                
                if (activePointers.size === 2 && state.pinchStartDist) {
                    // Pinch Zooming
                    const pts = Array.from(activePointers.values());
                    const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                    const currentMid = {
                        x: (pts[0].x + pts[1].x) / 2,
                        y: (pts[0].y + pts[1].y) / 2
                    };
                    
                    const scaleFactor = currentDist / state.pinchStartDist;
                    const targetZoom = state.pinchStartZoom * scaleFactor;
                    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
                    
                    const oldScale = state.fitScale * state.pinchStartZoom;
                    const newScale = state.fitScale * clampedZoom;
                    
                    const pt = clientToContent(
                        state.viewport,
                        state.contentEl,
                        state.pinchStartMid.x,
                        state.pinchStartMid.y,
                        oldScale,
                        state.pinchStartTx,
                        state.pinchStartTy
                    );
                    
                    state.userZoom = clampedZoom;
                    const midDx = currentMid.x - state.pinchStartMid.x;
                    const midDy = currentMid.y - state.pinchStartMid.y;
                    
                    const vr = state.viewport.getBoundingClientRect();
                    state.tx = (state.pinchStartMid.x - vr.left) - pt.x * newScale + midDx;
                    state.ty = (state.pinchStartMid.y - vr.top) - pt.y * newScale + midDy;
                    
                    applyTransform(state.transform, newScale, state.tx, state.ty, false);
                    state.suppressClick = true;
                } else if (activePointers.size === 1 && state.panStart) {
                    // Panning (Drag)
                    const dx = e.clientX - state.panStart.x;
                    const dy = e.clientY - state.panStart.y;
                    const dist = Math.hypot(dx, dy);
                    
                    // Only start panning and suppress clicks if movement exceeds threshold
                    if (dist > 8) {
                        state.suppressClick = true;
                        state.tx = state.initialTx + (dx - (dx / dist) * 8);
                        state.ty = state.initialTy + (dy - (dy / dist) * 8);
                        
                        const currentScale = state.fitScale * state.userZoom;
                        applyTransform(state.transform, currentScale, state.tx, state.ty, false);
                    }
                }
            },
            pointerup: (e) => {
                activePointers.delete(e.pointerId);
                
                if (activePointers.size === 0) {
                    state.panning = false;
                    state.panStart = null;
                    if (state.suppressClick) {
                        setTimeout(() => {
                            state.suppressClick = false;
                        }, 50);
                    }
                } else if (activePointers.size === 1) {
                    const remainingId = Array.from(activePointers.keys())[0];
                    const remainingPt = activePointers.get(remainingId);
                    state.panStart = { x: remainingPt.x, y: remainingPt.y };
                    state.initialTx = state.tx;
                    state.initialTy = state.ty;
                    state.pinchStartDist = null;
                }
            },
            pointercancel: (e) => {
                activePointers.delete(e.pointerId);
                if (activePointers.size === 0) {
                    state.panning = false;
                    state.panStart = null;
                    setTimeout(() => {
                        state.suppressClick = false;
                    }, 50);
                }
            }
        };

        viewport.addEventListener("wheel", handlers.wheel, { passive: false });
        viewport.addEventListener("pointerdown", handlers.pointerdown);
        viewport.addEventListener("pointermove", handlers.pointermove);
        viewport.addEventListener("pointerup", handlers.pointerup);
        viewport.addEventListener("pointercancel", handlers.pointercancel);

        active = { viewport, handlers, state };

        return {
            getFitScale: () => state.fitScale,
            reset: () => resetToDefault(state, true),
            isSuppressingClick: () => state.suppressClick,
            fitBoardToScreen: (lvl) => fitBoardToScreen(lvl)
        };
    }

    function isSuppressingClick() {
        return active?.state?.suppressClick ?? false;
    }

    function fitBoardToScreenPublic(level) {
        console.log("board-zoom.js: fitBoardToScreenPublic() called");
        if (active) {
            const { state } = active;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    state.userZoom = 1;
                    
                    const containerWidth = state.viewport.clientWidth;
                    const containerHeight = state.viewport.clientHeight;
                    
                    const { w: boardWidth, h: boardHeight } = measureContent(state.contentEl);
                    
                    const currentTransform = state.transform.style.transform;
                    
                    state.fitScale = computeFitScale(state.viewport, state.contentEl, level || state.level);
                    
                    console.log("containerWidth", containerWidth);
                    console.log("containerHeight", containerHeight);
                    console.log("computedScale", state.fitScale);
                    console.log("currentTransform", currentTransform);
                    
                    const c = centerOffset(state.viewport, state.contentEl, level || state.level, state.fitScale);
                    state.tx = c.tx;
                    state.ty = c.ty;
                    
                    console.log("Level loaded");
                    console.log("Board width:", boardWidth);
                    console.log("Board height:", boardHeight);
                    console.log("Calculated scale:", state.fitScale);
                    console.log("Board center X:", state.tx);
                    console.log("Board center Y:", state.ty);
                    
                    applyTransform(state.transform, state.fitScale, state.tx, state.ty, false);
                });
            });
        }
    }

    function playIntroReveal(level, onComplete) {
        if (!active) {
            if (onComplete) onComplete();
            return;
        }
        const state = active.state;
        state.level = level || state.level;
        state.userZoom = 1;
        
        const { w: boardWidth, h: boardHeight } = measureContent(state.contentEl);
        
        // Step 1: Snap to zoomed-out intro scale (e.g., 0.55 for 45% margin)
        const introScale = computeFitScale(state.viewport, state.contentEl, state.level, 0.55);
        const introCenter = centerOffset(state.viewport, state.contentEl, state.level, introScale);
        
        // Apply without animation
        applyTransform(state.transform, introScale, introCenter.tx, introCenter.ty, false);
        
        // Disable interactions during intro
        state.suppressClick = true;
        
        // Step 2: Hold for 600ms, then animate to gameplay scale (e.g., 0.70 for 30% margin)
        setTimeout(() => {
            if (!active) return;
            const gameplayScale = computeFitScale(state.viewport, state.contentEl, state.level, 0.70);
            state.fitScale = gameplayScale;
            const gameplayCenter = centerOffset(state.viewport, state.contentEl, state.level, gameplayScale);
            state.tx = gameplayCenter.tx;
            state.ty = gameplayCenter.ty;
            
            // Apply with animation (smooth zoom)
            applyTransform(state.transform, gameplayScale, gameplayCenter.tx, gameplayCenter.ty, true);
            
            // Step 3: Wait for animation to finish, then complete
            setTimeout(() => {
                if (!active) return;
                state.suppressClick = false;
                if (onComplete) onComplete();
            }, 800); // 800ms duration for the CSS transition
        }, 600);
    }

    return { init, destroy, isSuppressingClick, fitBoardToScreen: fitBoardToScreenPublic, playIntroReveal };
})();

function initBoardZoom(wrap, transformEl, level) {
    console.log("board-zoom.js: initBoardZoom() called with level.id =", level?.id);
    return BoardZoom.init(wrap, transformEl, level);
}

function destroyBoardZoom() {
    console.log("board-zoom.js: destroyBoardZoom() called");
    BoardZoom.destroy();
}

function isBoardZoomSuppressingClick() {
    return BoardZoom.isSuppressingClick();
}

function fitBoardToScreen(level) {
    console.log("board-zoom.js: fitBoardToScreen() global function called");
    BoardZoom.fitBoardToScreen(level);
}

function playIntroReveal(level, onComplete) {
    console.log("board-zoom.js: playIntroReveal() global function called");
    BoardZoom.playIntroReveal(level, onComplete);
}
