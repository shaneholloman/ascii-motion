/**
 * Font definitions for ASCII Motion
 * Provides curated monospace fonts optimized for ASCII art rendering
 */
export interface MonospaceFont {
    id: string;
    name: string;
    displayName: string;
    cssStack: string;
    category: 'system' | 'web' | 'fallback';
    platforms?: ('macos' | 'windows' | 'linux')[];
    description: string;
    isBundled?: boolean;
    fileSize?: string;
}
export declare const MONOSPACE_FONTS: MonospaceFont[];
/**
 * Get font by ID
 */
export declare const getFontById: (id: string) => MonospaceFont;
/**
 * Default font ID (auto-selection)
 */
export declare const DEFAULT_FONT_ID = "auto";
/**
 * Get CSS font stack for canvas/CSS usage (no quotes around individual font names)
 */
export declare const getFontStack: (fontId: string) => string;
//# sourceMappingURL=fonts.d.ts.map