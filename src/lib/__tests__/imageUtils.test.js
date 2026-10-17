import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processProfileImage } from '../imageUtils';

describe('imageUtils - processProfileImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects if no file is provided', async () => {
    await expect(processProfileImage(null)).rejects.toThrow('NO_FILE_PROVIDED');
  });

  it('rejects if file is not an image type', async () => {
    const textFile = new File(['hello world'], 'hello.txt', { type: 'text/plain' });
    await expect(processProfileImage(textFile)).rejects.toThrow('INVALID_FILE_TYPE');
  });

  it('processes image file and resizes if over 1MB', async () => {
    // Mock 1.5MB image file
    const largeContent = new Uint8Array(1.5 * 1024 * 1024);
    const mockFile = new File([largeContent], 'large_avatar.png', { type: 'image/png' });

    // Mock Canvas and Image
    const mockContext = {
      drawImage: vi.fn(),
    };

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => mockContext,
          toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockResizedImageData'),
        };
      }
      return originalCreateElement(tagName);
    });

    // Mock Image load
    const originalImage = global.Image;
    global.Image = class {
      constructor() {
        this.width = 1200;
        this.height = 800;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    };

    try {
      const result = await processProfileImage(mockFile, 512, 1024 * 1024);
      expect(result).toBe('data:image/jpeg;base64,mockResizedImageData');
      expect(mockContext.drawImage).toHaveBeenCalled();
    } finally {
      global.Image = originalImage;
    }
  });

  it('processes image under 1MB without excessive downscaling', async () => {
    // 50KB image file
    const smallContent = new Uint8Array(50 * 1024);
    const smallFile = new File([smallContent], 'avatar.jpg', { type: 'image/jpeg' });

    const mockContext = {
      drawImage: vi.fn(),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => mockContext,
          toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockSmallImageData'),
        };
      }
      return document.createElement(tagName);
    });

    const originalImage = global.Image;
    global.Image = class {
      constructor() {
        this.width = 250;
        this.height = 250;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    };

    try {
      const result = await processProfileImage(smallFile, 512, 1024 * 1024);
      expect(result).toBe('data:image/jpeg;base64,mockSmallImageData');
    } finally {
      global.Image = originalImage;
    }
  });
});
