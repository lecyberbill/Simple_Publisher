import * as fabric from 'fabric';

/**
 * Patches Fabric.js prototypes to add custom functionality:
 * 1. Background Color & Custom Border
 * 2. Vertical Alignment
 * 3. Fixed Height (Reflow)
 * 4. Advanced Tabulation (TODO)
 */
export const patchFabricTextRender = () => {
    // Helper to apply patch to a prototype
    const applyPatch = (prototype: any, name: string) => {
        if (!prototype) return;
        // Ensure we don't apply twice if HMR re-runs, though overriding is mostly safe
        if (prototype._patchedRenderBackground) {
            // console.log(`Fabric patch already applied to ${name}`);
            // return; 
        }

        // PATCH 1: Render Background & Border
        prototype._renderBackground = function (ctx: CanvasRenderingContext2D) {
            // 1. Draw Standard Background (fill)
            if (this.backgroundColor) {
                ctx.fillStyle = this.backgroundColor;
                ctx.fillRect(
                    -this.width / 2,
                    -this.height / 2,
                    this.width,
                    this.height
                );
            }

            // 2. Draw Custom Border (outline around the block)
            if (this.boxBorderColor && this.boxBorderWidth > 0) {
                const originalStroke = ctx.strokeStyle;
                const originalLineWidth = ctx.lineWidth;
                try {
                    ctx.strokeStyle = this.boxBorderColor;
                    ctx.lineWidth = this.boxBorderWidth;
                    ctx.strokeRect(
                        -this.width / 2,
                        -this.height / 2,
                        this.width,
                        this.height
                    );
                } finally {
                    ctx.strokeStyle = originalStroke;
                    ctx.lineWidth = originalLineWidth;
                }
            }
        };

        // PATCH 2: Vertical Alignment
        // Make patch idempotent to avoid HMR wrapping recursion
        if (!prototype.__originalRenderText) {
            prototype.__originalRenderText = prototype._renderText;
        }
        const originalRenderText = prototype.__originalRenderText;

        prototype._renderText = function (ctx: CanvasRenderingContext2D) {
            // Calculate dimensions
            // Note: calcTextHeight() might be expensive, check if cached
            const textHeight = this.calcTextHeight();
            const containerHeight = this.height;

            let dy = 0;

            if (this.verticalAlign === 'middle') {
                dy = (containerHeight - textHeight) / 2;
            } else if (this.verticalAlign === 'bottom') {
                dy = containerHeight - textHeight;
            }

            if (dy > 0) {
                ctx.save();
                ctx.translate(0, dy);
                originalRenderText.call(this, ctx);
                ctx.restore();
            } else {
                originalRenderText.call(this, ctx);
            }
        };

        // PATCH 3: Prevent Auto-Height Reset (Reflow/Fixed Height Mode)
        const originalInitDimensions = prototype.initDimensions;
        prototype.initDimensions = function () {
            const originalHeight = this.height;
            originalInitDimensions.call(this);

            if (this.lockScalingY === false && originalHeight > this.height) {
                this.height = originalHeight;
            }
        };

        // PATCH 4: Advanced Tabulation
        const originalMeasureLine = prototype._measureLine;

        prototype._measureLine = function (lineIndex: number) {
            // 1. Run original logic first to ensure robust initialization of __charBounds
            // This prevents crashes in Textbox where my previous full overwrite missed necessary setups.
            const result = originalMeasureLine.call(this, lineIndex);

            // 2. If no tabs, we are done
            if (!this.tabs || this.tabs.length === 0 || !this.__charBounds || !this.__charBounds[lineIndex]) {
                return result;
            }

            // 3. Post-process for Tabs
            // We need to recalculate positions because Tabs expand the width dynamically.
            const line = this._textLines[lineIndex];
            const charBounds = this.__charBounds[lineIndex];
            const tabs = (this.tabs || []).sort((a: number, b: number) => a - b);

            let currentWidth = 0;
            let numOfSpaces = 0;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                // Reuse the bounds calculated by original method as base
                // But we must respect the 'left' position cumulative calculation
                const bound = charBounds[i];

                // If original method failed to create bound (shouldn't happen if logic is correct), skip
                if (!bound) continue;

                let charWidth = bound.width;

                // Handle Tab
                if (char === '\t') {
                    // Find next tab stop
                    const nextTab = tabs.find((t: number) => t > currentWidth);
                    if (nextTab) {
                        charWidth = nextTab - currentWidth;
                    } else {
                        // Default tab behavior (e.g. 50px steps)
                        const defaultTabWidth = 50;
                        charWidth = defaultTabWidth - (currentWidth % defaultTabWidth);
                    }
                    if (charWidth < 1) charWidth = 50; // Safety floor

                    // Update bound
                    bound.width = charWidth;
                    bound.kernedWidth = charWidth; // Tabs shouldn't kern?
                } else if (char === ' ') {
                    numOfSpaces++;
                }

                // Update Left Position
                bound.left = currentWidth;

                currentWidth += charWidth;

                // Apply spacing (if applyPatch is on Textbox, it might handle spacing differently, 
                // but we apply consistent spacing here if needed. 
                // Fabric's originalMeasureLine applies charSpacing to width usually.
                // We should replicate that if we are recalculating currentWidth.)
                if (this.charSpacing && (i < line.length - 1 || !this.isWrapping)) {
                    currentWidth += this.charSpacing;
                }
            }

            // Return updated metrics
            // Note: We modified the objects in __charBounds[lineIndex] in-place.
            return { width: currentWidth, numOfSpaces: numOfSpaces };
        };

        // PATCH 4b: Render Tabs Correctly
        // Override _renderTextLine to force use of __charBounds for positioning
        prototype._renderTextLine = function (method: string, ctx: CanvasRenderingContext2D, line: string, left: number, top: number, lineIndex: number) {
            // Render background and decorations (underline, linethrough, overline)
            // We must call these to ensure "Underline" button works.
            // Using try-catch or checks to avoid crashing if method names differ in specific Fabric versions, 
            // but standard names are _renderTextBackground and _renderTextDecoration.

            if (this._renderTextBackground) {
                this._renderTextBackground(ctx, lineIndex);
            }
            if (this._renderTextDecoration) {
                this._renderTextDecoration(ctx, lineIndex);
            }

            // Iterate over characters using our pre-calculated bounds
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const bound = this.__charBounds[lineIndex][i];

                // If it's a renderable character (not a tab/space that is invisible?)
                // Actually spacing characters are "rendered" (cursor movement).
                // But _renderChar calls basic draw.

                // For Tab, we don't draw anything, just advance cursor.
                if (char === '\t') {
                    // Do nothing, just skip.
                    // Debug: console.log("Skipping tab render", bound.width);
                } else {
                    // Draw normal character at the specific position
                    // Note: 'left' passed to function is the line's starting X.
                    // bound.left is relative to line start.

                    // We trust Fabric's _renderChar handles styles.
                    // But we must pass the Correct Left Position.

                    this._renderChar(method, ctx, lineIndex, i, char, left + bound.left, top);
                }
            }
        };

        // PATCH 5: Custom Underline Offset (Split Rendering)
        // We separate rendering of Underline (which can be offset) from Linethrough/Overline (which shouldn't be).
        const patchDecorationRendering = (proto: any) => {
            const originalFn = proto._renderTextDecoration;

            proto._renderTextDecoration = function (ctx: CanvasRenderingContext2D, ...args: any[]) {
                // 1. Save original state
                const originalUnderline = this.underline;
                const originalLinethrough = this.linethrough;
                const originalOverline = this.overline;

                // 2. Render Static Decorations (Linethrough, Overline)
                // Temporarily disable underline so it doesn't render here
                this.underline = false;
                if (this.linethrough || this.overline) {
                    originalFn.call(this, ctx, ...args);
                }

                // 3. Render Offset Decoration (Underline)
                // Restore underline, disable others
                this.underline = originalUnderline;
                this.linethrough = false;
                this.overline = false;

                if (this.underline) {
                    const offset = (this as any).underlineOffset || 0;
                    if (offset !== 0) {
                        ctx.save();
                        ctx.translate(0, offset);
                        originalFn.call(this, ctx, ...args);
                        ctx.restore();
                    } else {
                        originalFn.call(this, ctx, ...args);
                    }
                }

                // 4. Restore Full Original State
                this.underline = originalUnderline;
                this.linethrough = originalLinethrough;
                this.overline = originalOverline;
            };
        };

        // Apply to generic text prototype
        patchDecorationRendering(prototype);

        // Explicitly patch Textbox if it overrides _renderTextDecoration (it usually does or inherits)
        // But in our previous code we saw we might need to handle it specifically if it wasn't covered.
        // Actually, if we patch the base prototype that Textbox uses, it's fine. 
        // But if Textbox.prototype has its OWN _renderTextDecoration, we must patch that too.
        if (fabric.Textbox && fabric.Textbox.prototype._renderTextDecoration !== prototype._renderTextDecoration) {
            patchDecorationRendering(fabric.Textbox.prototype);
        }
        // if (fabric.Textbox) applyPatch(fabric.Textbox.prototype, 'fabric.Textbox');
    };

    // Apply to standard text classes
    if (fabric.Text) applyPatch(fabric.Text.prototype, 'fabric.Text');
};
