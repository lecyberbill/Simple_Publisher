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
    const applyPatch = (prototype: any, _name: string) => {
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

        // PATCH 4: Advanced Tabulation (REMOVED - Unused and caused conflicts with TextPath)
        // Original code removed to prevent interference with Fabric's native rendering.

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
