/**
 * Classic ANSI Characters Autofill Palette
 * 
 * Uses traditional ASCII characters (letters, numbers, punctuation) to represent
 * filled regions within bezier shapes. This palette is organized by density
 * and visual pattern similarity.
 * 
 * Character Selection Philosophy:
 * - High density: # @ & % W M
 * - Medium density: = + * X O
 * - Low density: . : - ' `
 * - Directional: | _ / \ 
 * - Corner/edge combinations
 */

import type { AutofillPalette } from './types';

export const ANSI_CHARACTERS_PALETTE: AutofillPalette = {
  id: 'ansi',
  name: 'Classic ANSI',
  description: 'Traditional ASCII art characters using letters, numbers, and symbols',
  patterns: [
    // ========== FULL COVERAGE (all 9 regions filled) ==========
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '#',
      description: 'All regions filled - use dense character',
    },

    // ========== HORIZONTAL FILLS ==========
    {
      regions: new Set(['TL', 'TC', 'TR']),
      character: '^',
      description: 'Top row only - favor top',
    },
    {
      regions: new Set(['ML', 'MC', 'MR']),
      character: '=',
      description: 'Middle row only',
    },
    {
      regions: new Set(['BL', 'BC', 'BR']),
      character: '_',
      description: 'Bottom row only - favor bottom',
    },

    // ========== VERTICAL FILLS ==========
    {
      regions: new Set(['TL', 'ML', 'BL']),
      character: '|',
      description: 'Left column only',
    },
    {
      regions: new Set(['TC', 'MC', 'BC']),
      character: '|',
      description: 'Center column only',
    },
    {
      regions: new Set(['TR', 'MR', 'BR']),
      character: '|',
      description: 'Right column only',
    },

    // ========== DIAGONAL PATTERNS ==========
    {
      regions: new Set(['TL', 'MC', 'BR']),
      character: '\\',
      description: 'Diagonal top-left to bottom-right',
    },
    {
      regions: new Set(['TR', 'MC', 'BL']),
      character: '/',
      description: 'Diagonal top-right to bottom-left',
    },

    // ========== LARGE REGIONS (7-8 filled) ==========
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC']),
      character: '@',
      description: 'Nearly full - missing bottom-right',
    },
    {
      regions: new Set(['TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '@',
      description: 'Nearly full - missing top-left',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BC', 'BR']),
      character: '@',
      description: 'Nearly full - missing bottom-left',
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '@',
      description: 'Nearly full - missing top-right',
    },

    // ========== QUADRANTS ==========
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC']),
      character: '%',
      description: 'Top-left quadrant',
    },
    {
      regions: new Set(['TC', 'TR', 'MC', 'MR']),
      character: '%',
      description: 'Top-right quadrant',
    },
    {
      regions: new Set(['ML', 'MC', 'BL', 'BC']),
      character: '%',
      description: 'Bottom-left quadrant',
    },
    {
      regions: new Set(['MC', 'MR', 'BC', 'BR']),
      character: '%',
      description: 'Bottom-right quadrant',
    },

    // ========== HALF FILLS ==========
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR']),
      character: '^',
      description: 'Top half - favor top',
    },
    {
      regions: new Set(['ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '_',
      description: 'Bottom half - favor bottom',
    },
    {
      regions: new Set(['TL', 'ML', 'BL', 'TC', 'MC', 'BC']),
      character: '[',
      description: 'Left half wide',
    },
    {
      regions: new Set(['TR', 'MR', 'BR', 'TC', 'MC', 'BC']),
      character: ']',
      description: 'Right half wide',
    },

    // ========== CORNER FILLS ==========
    {
      regions: new Set(['TL']),
      character: '`',
      description: 'Top-left corner only',
    },
    {
      regions: new Set(['TR']),
      character: '\'',
      description: 'Top-right corner only',
    },
    {
      regions: new Set(['BL']),
      character: ',',
      description: 'Bottom-left corner only',
    },
    {
      regions: new Set(['BR']),
      character: '.',
      description: 'Bottom-right corner only',
    },

    // ========== L-SHAPES ==========
    {
      regions: new Set(['TL', 'TC', 'ML', 'BL']),
      character: '&',
      description: 'L-shape: top-left',
    },
    {
      regions: new Set(['TC', 'TR', 'MR', 'BR']),
      character: '&',
      description: 'L-shape: top-right',
    },
    {
      regions: new Set(['TL', 'ML', 'BL', 'BC']),
      character: '&',
      description: 'L-shape: bottom-left',
    },
    {
      regions: new Set(['TR', 'MR', 'BC', 'BR']),
      character: '&',
      description: 'L-shape: bottom-right',
    },

    // ========== CENTER + CROSS PATTERNS ==========
    {
      regions: new Set(['TC', 'ML', 'MC', 'MR', 'BC']),
      character: '+',
      description: 'Center cross',
    },
    {
      regions: new Set(['MC']),
      character: '·',
      description: 'Center dot only',
    },
    {
      regions: new Set(['TL', 'TR', 'MC', 'BL', 'BR']),
      character: 'X',
      description: 'X pattern (diagonal cross)',
    },

    // ========== EDGE COMBINATIONS ==========
    {
      regions: new Set(['TL', 'TC', 'TR', 'BL', 'BC', 'BR']),
      character: '=',
      description: 'Top and bottom edges',
    },
    {
      regions: new Set(['TL', 'ML', 'BL']),
      character: '|',
      description: 'Left edge only',
    },
    {
      regions: new Set(['TR', 'MR', 'BR']),
      character: '|',
      description: 'Right edge only',
    },

    // ========== T-SHAPES ==========
    {
      regions: new Set(['TL', 'TC', 'TR', 'MC']),
      character: 'n',
      description: 'T-shape pointing down',
    },
    {
      regions: new Set(['MC', 'BL', 'BC', 'BR']),
      character: 'u',
      description: 'T-shape pointing up (inverted)',
    },
    {
      regions: new Set(['TL', 'ML', 'MC', 'MR', 'BL']),
      character: 'o',
      description: 'T-shape pointing right',
    },
    {
      regions: new Set(['TR', 'ML', 'MC', 'MR', 'BR']),
      character: 'o',
      description: 'T-shape pointing left',
    },

    // ========== MEDIUM DENSITY PATTERNS ==========
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'MR', 'BC', 'BR']),
      character: '*',
      description: 'Medium density - diagonal band',
    },
    {
      regions: new Set(['TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC']),
      character: '*',
      description: 'Medium density - opposite diagonal',
    },
    {
      regions: new Set(['TL', 'TR', 'BL', 'BR']),
      character: 'O',
      description: 'Four corners only',
    },

    // ========== SPARSE PATTERNS ==========
    {
      regions: new Set(['TL', 'BR']),
      character: ':',
      description: 'Opposite corners: TL and BR',
    },
    {
      regions: new Set(['TR', 'BL']),
      character: ':',
      description: 'Opposite corners: TR and BL',
    },
    {
      regions: new Set(['TC', 'BC']),
      character: ':',
      description: 'Top and bottom center',
    },
    {
      regions: new Set(['ML', 'MR']),
      character: '-',
      description: 'Left and right center',
    },

    // ========== MINIMAL PATTERNS ==========
    {
      regions: new Set(['TC']),
      character: '^',
      description: 'Top center only',
    },
    {
      regions: new Set(['BC']),
      character: '_',
      description: 'Bottom center only',
    },
    {
      regions: new Set(['ML']),
      character: '<',
      description: 'Middle-left only',
    },
    {
      regions: new Set(['MR']),
      character: '>',
      description: 'Middle-right only',
    },

    // ========== 3-REGION EDGE PATTERNS ==========
    {
      regions: new Set(['TL', 'TC', 'MC']),
      character: '/',
      description: 'Top-left to center diagonal',
    },
    {
      regions: new Set(['TC', 'TR', 'MC']),
      character: '\\',
      description: 'Top-right to center diagonal',
    },
    {
      regions: new Set(['MC', 'BL', 'BC']),
      character: '\\',
      description: 'Center to bottom-left diagonal',
    },
    {
      regions: new Set(['MC', 'BC', 'BR']),
      character: '/',
      description: 'Center to bottom-right diagonal',
    },
    {
      regions: new Set(['TL', 'ML', 'MC']),
      character: '(',
      description: 'Top-left curve down',
    },
    {
      regions: new Set(['ML', 'MC', 'BL']),
      character: '(',
      description: 'Bottom-left curve up',
    },
    {
      regions: new Set(['TR', 'MR', 'MC']),
      character: ')',
      description: 'Top-right curve down',
    },
    {
      regions: new Set(['MC', 'MR', 'BR']),
      character: ')',
      description: 'Bottom-right curve up',
    },
    {
      regions: new Set(['TL', 'TC', 'ML']),
      character: 'r',
      description: 'Top-left corner tight',
    },
    {
      regions: new Set(['TC', 'TR', 'MR']),
      character: '7',
      description: 'Top-right corner tight',
    },
    {
      regions: new Set(['ML', 'BL', 'BC']),
      character: 'L',
      description: 'Bottom-left corner tight',
    },
    {
      regions: new Set(['MR', 'BC', 'BR']),
      character: 'J',
      description: 'Bottom-right corner tight',
    },

    // ========== 4-REGION L-SHAPES AND CORNERS ==========
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC']),
      character: 'o',
      description: 'Top-left L-shape',
    },
    {
      regions: new Set(['TC', 'TR', 'MC', 'MR']),
      character: 'o',
      description: 'Top-right L-shape',
    },
    {
      regions: new Set(['ML', 'MC', 'BL', 'BC']),
      character: 'o',
      description: 'Bottom-left L-shape',
    },
    {
      regions: new Set(['MC', 'MR', 'BC', 'BR']),
      character: 'o',
      description: 'Bottom-right L-shape',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML']),
      character: '$',
      description: 'Top row with left edge',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'MR']),
      character: '$',
      description: 'Top row with right edge',
    },
    {
      regions: new Set(['TL', 'ML', 'BL', 'BC']),
      character: 'c',
      description: 'Left column with bottom',
    },
    {
      regions: new Set(['TR', 'MR', 'BR', 'BC']),
      character: 'c',
      description: 'Right column with bottom',
    },
    {
      regions: new Set(['ML', 'BL', 'BC', 'BR']),
      character: 'o',
      description: 'Bottom U-shape',
    },
    {
      regions: new Set(['MR', 'BL', 'BC', 'BR']),
      character: 'o',
      description: 'Bottom U-shape right-heavy',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'MC']),
      character: 'n',
      description: 'Top row with center',
    },
    {
      regions: new Set(['MC', 'BL', 'BC', 'BR']),
      character: 'u',
      description: 'Bottom row with center',
    },
    {
      regions: new Set(['TL', 'ML', 'MC', 'BC']),
      character: '/',
      description: 'Diagonal L top-left to bottom-center',
    },
    {
      regions: new Set(['TR', 'MR', 'MC', 'BC']),
      character: '\\',
      description: 'Diagonal L top-right to bottom-center',
    },
    {
      regions: new Set(['TC', 'ML', 'MC', 'BL']),
      character: '\\',
      description: 'Diagonal L top-center to bottom-left',
    },
    {
      regions: new Set(['TC', 'MC', 'MR', 'BR']),
      character: '/',
      description: 'Diagonal L top-center to bottom-right',
    },

    // ========== 5-REGION EDGE PATTERNS ==========
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'BL']),
      character: '[',
      description: 'Left column with top',
    },
    {
      regions: new Set(['TR', 'TC', 'MR', 'MC', 'BR']),
      character: ']',
      description: 'Right column with top',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC']),
      character: '^',
      description: 'Top row with left center',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'MC', 'MR']),
      character: '^',
      description: 'Top row with right center',
    },
    {
      regions: new Set(['BL', 'BC', 'BR', 'ML', 'MC']),
      character: '_',
      description: 'Bottom row with left center',
    },
    {
      regions: new Set(['BL', 'BC', 'BR', 'MR', 'MC']),
      character: '_',
      description: 'Bottom row with right center',
    },
    {
      regions: new Set(['TC', 'TR', 'MR', 'MC', 'BL']),
      character: 'S',
      description: 'Diagonal S-curve top-right to bottom-left',
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'BR']),
      character: 'Z',
      description: 'Diagonal Z-curve top-left to bottom-right',
    },
    {
      regions: new Set(['TL', 'ML', 'MC', 'BC', 'BR']),
      character: 'Z',
      description: 'Diagonal Z-shape lower-right heavy',
    },
    {
      regions: new Set(['TR', 'MR', 'MC', 'BC', 'BL']),
      character: 'S',
      description: 'Diagonal S-shape lower-left heavy',
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'BC']),
      character: 'h',
      description: 'L-shape top-left with bottom-center',
    },
    {
      regions: new Set(['TC', 'TR', 'MR', 'MC', 'BC']),
      character: 'y',
      description: 'L-shape top-right with bottom-center',
    },
    {
      regions: new Set(['ML', 'MC', 'BL', 'BC', 'TR']),
      character: 's',
      description: 'L-shape bottom-left with top-right',
    },
    {
      regions: new Set(['MC', 'MR', 'BC', 'BR', 'TL']),
      character: 's',
      description: 'L-shape bottom-right with top-left',
    },

    // ========== 6-REGION COMPLEX EDGES ==========
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'BL']),
      character: '$',
      description: 'Left-heavy block with top',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'MC', 'MR', 'BR']),
      character: '$',
      description: 'Right-heavy block with top',
    },
    {
      regions: new Set(['TL', 'ML', 'MC', 'MR', 'BL', 'BC']),
      character: 's',
      description: 'Left-bottom heavy block',
    },
    {
      regions: new Set(['TR', 'ML', 'MC', 'MR', 'BC', 'BR']),
      character: 's',
      description: 'Right-bottom heavy block',
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'BC', 'BR']),
      character: 's',
      description: 'Diagonal band top-left to bottom-right',
    },
    {
      regions: new Set(['TC', 'TR', 'ML', 'MC', 'BL', 'BC']),
      character: 's',
      description: 'Diagonal band top-right to bottom-left',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'BL', 'BC']),
      character: 'o',
      description: 'Top row with left-bottom L',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'MR', 'BC', 'BR']),
      character: 'o',
      description: 'Top row with right-bottom L',
    },
    {
      regions: new Set(['TL', 'ML', 'MC', 'MR', 'BC', 'BR']),
      character: 'o',
      description: 'Top-left with bottom-right heavy',
    },
    {
      regions: new Set(['TR', 'ML', 'MC', 'MR', 'BL', 'BC']),
      character: 'o',
      description: 'Top-right with bottom-left heavy',
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'MR', 'BC']),
      character: '$',
      description: 'Top-left with horizontal middle',
    },
    {
      regions: new Set(['TC', 'TR', 'ML', 'MC', 'MR', 'BC']),
      character: '$',
      description: 'Top-right with horizontal middle',
    },

    // ========== 7-REGION NEAR-FULL PATTERNS ==========
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL']),
      character: '@',
      description: 'Nearly full - missing bottom-right',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BR']),
      character: '@',
      description: 'Nearly full - missing bottom-left',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'BL', 'BC']),
      character: '@',
      description: 'Nearly full - missing middle-right',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'MC', 'MR', 'BC', 'BR']),
      character: '@',
      description: 'Nearly full - missing middle-left',
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '@',
      description: 'Nearly full - missing top-right',
    },
    {
      regions: new Set(['TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '@',
      description: 'Nearly full - missing top-left',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BC']),
      character: '@',
      description: 'Nearly full - missing both bottom corners',
    },
    {
      regions: new Set(['TL', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '@',
      description: 'Nearly full - missing both top-right',
    },
    {
      regions: new Set(['TC', 'TR', 'ML', 'MC', 'MR', 'BC', 'BR']),
      character: '@',
      description: 'Nearly full - missing top-left and bottom-left',
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'MR', 'BL', 'BC']),
      character: '@',
      description: 'Nearly full - missing top-right and bottom-right',
    },

    // ========== 8-REGION PATTERNS (near-complete) ==========
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC']),
      character: '@',
      description: 'All except bottom-right',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BC', 'BR']),
      character: '@',
      description: 'All except bottom-left',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'BC', 'BL', 'BR']),
      character: '@',
      description: 'All except middle-right',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'MC', 'MR', 'BC', 'BL', 'BR']),
      character: '@',
      description: 'All except middle-left',
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'MR', 'BC', 'BL', 'BR']),
      character: '@',
      description: 'All except top-right',
    },
    {
      regions: new Set(['TC', 'TR', 'ML', 'MC', 'MR', 'BC', 'BL', 'BR']),
      character: '@',
      description: 'All except top-left',
    },
    {
      regions: new Set(['TL', 'ML', 'MC', 'MR', 'BC', 'BL', 'BR', 'TR']),
      character: '@',
      description: 'All except top-center',
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BR']),
      character: '@',
      description: 'All except bottom-center',
    },

    // ========== 2-REGION SPECIFIC CORNERS ==========
    {
      regions: new Set(['TL', 'BR']),
      character: '\\',
      description: 'Diagonal corners: top-left and bottom-right',
    },
    {
      regions: new Set(['TR', 'BL']),
      character: '/',
      description: 'Diagonal corners: top-right and bottom-left',
    },
    {
      regions: new Set(['TL', 'MR']),
      character: '`',
      description: 'Top-left corner with middle-right',
    },
    {
      regions: new Set(['TR', 'ML']),
      character: '\'',
      description: 'Top-right corner with middle-left',
    },
    {
      regions: new Set(['BL', 'MR']),
      character: ',',
      description: 'Bottom-left corner with middle-right',
    },
    {
      regions: new Set(['BR', 'ML']),
      character: '.',
      description: 'Bottom-right corner with middle-left',
    },
    {
      regions: new Set(['TL', 'BC']),
      character: '`',
      description: 'Top-left corner with bottom-center',
    },
    {
      regions: new Set(['TR', 'BC']),
      character: '\'',
      description: 'Top-right corner with bottom-center',
    },
    {
      regions: new Set(['BL', 'TC']),
      character: ',',
      description: 'Bottom-left corner with top-center',
    },
    {
      regions: new Set(['BR', 'TC']),
      character: '.',
      description: 'Bottom-right corner with top-center',
    },
    {
      regions: new Set(['TL', 'TC']),
      character: '^',
      description: 'Top-left and top-center',
    },
    {
      regions: new Set(['TR', 'TC']),
      character: '^',
      description: 'Top-right and top-center',
    },
    {
      regions: new Set(['BL', 'BC']),
      character: '_',
      description: 'Bottom-left and bottom-center',
    },
    {
      regions: new Set(['BR', 'BC']),
      character: '_',
      description: 'Bottom-right and bottom-center',
    },
    {
      regions: new Set(['TL', 'ML']),
      character: '(',
      description: 'Top-left and middle-left',
    },
    {
      regions: new Set(['ML', 'BL']),
      character: '(',
      description: 'Middle-left and bottom-left',
    },
    {
      regions: new Set(['TR', 'MR']),
      character: ')',
      description: 'Top-right and middle-right',
    },
    {
      regions: new Set(['MR', 'BR']),
      character: ')',
      description: 'Middle-right and bottom-right',
    },

    // ========== FALLBACK (empty cell) ==========
    {
      regions: new Set([]),
      character: ' ',
      description: 'Empty cell - no fill',
    },
  ],
};
