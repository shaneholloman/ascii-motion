import { describe, it, expect } from 'vitest';
import { cropCanvasToSelection, cropAllFramesToSelection } from '../utils/cropUtils';
import type { Cell } from '../types';

describe('cropUtils', () => {
  describe('cropCanvasToSelection', () => {
    it('should crop canvas to selection bounds', () => {
      // Create a 5x5 canvas with some cells
      const cells = new Map<string, Cell>();
      cells.set('1,1', { char: 'A', color: '#FF0000', bgColor: 'transparent' });
      cells.set('2,1', { char: 'B', color: '#FF0000', bgColor: 'transparent' });
      cells.set('1,2', { char: 'C', color: '#FF0000', bgColor: 'transparent' });
      cells.set('2,2', { char: 'D', color: '#FF0000', bgColor: 'transparent' });

      // Select cells at (1,1), (2,1), (1,2), (2,2)
      const selectedCells = new Set<string>(['1,1', '2,1', '1,2', '2,2']);

      const result = cropCanvasToSelection(cells, selectedCells);

      expect(result).not.toBeNull();
      expect(result?.newWidth).toBe(2);
      expect(result?.newHeight).toBe(2);
      
      // Check repositioned cells
      expect(result?.croppedCells.get('0,0')).toEqual({ char: 'A', color: '#FF0000', bgColor: 'transparent' });
      expect(result?.croppedCells.get('1,0')).toEqual({ char: 'B', color: '#FF0000', bgColor: 'transparent' });
      expect(result?.croppedCells.get('0,1')).toEqual({ char: 'C', color: '#FF0000', bgColor: 'transparent' });
      expect(result?.croppedCells.get('1,1')).toEqual({ char: 'D', color: '#FF0000', bgColor: 'transparent' });
    });

    it('should return null for empty selection', () => {
      const cells = new Map<string, Cell>();
      const selectedCells = new Set<string>();

      const result = cropCanvasToSelection(cells, selectedCells);

      expect(result).toBeNull();
    });
  });

  describe('cropAllFramesToSelection', () => {
    it('should crop all frames consistently', () => {
      const frame1 = new Map<string, Cell>();
      frame1.set('2,2', { char: 'A', color: '#FF0000', bgColor: 'transparent' });

      const frame2 = new Map<string, Cell>();
      frame2.set('2,2', { char: 'X', color: '#00FF00', bgColor: 'transparent' });

      const frames = [{ data: frame1 }, { data: frame2 }];
      const selectedCells = new Set<string>(['2,2', '3,2']);

      const result = cropAllFramesToSelection(frames, selectedCells);

      expect(result).not.toBeNull();
      expect(result?.length).toBe(2);
    });
  });
});
