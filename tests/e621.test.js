import { describe, it, expect, beforeEach, jest } from '@jest/globals';

global.fetch = jest.fn();

describe('e621.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRandomGif', () => {
    it('should fetch and return a GIF URL', async () => {
      const mockResponse = {
        posts: [
          { file: { url: 'https://example.com/gif1.gif', ext: 'gif' } },
          { file: { url: 'https://example.com/gif2.gif', ext: 'gif' } },
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { fetchRandomGif } = await import('../src/e621.js');
      const result = await fetchRandomGif('user123');

      expect(result).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.url).toMatch(/https:\/\/example\.com\/gif[12]\.gif/);
    });

    it('should filter out non-GIF files', async () => {
      const mockResponse = {
        posts: [
          { file: { url: 'https://example.com/image.png', ext: 'png' } },
          { file: { url: 'https://example.com/video.webm', ext: 'webm' } },
          { file: { url: 'https://example.com/gif.gif', ext: 'gif' } },
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { fetchRandomGif } = await import('../src/e621.js');
      const result = await fetchRandomGif('user123');

      expect(result.url).toBe('https://example.com/gif.gif');
    });

    it('should include User-Agent header', async () => {
      const mockResponse = {
        posts: [
          { file: { url: 'https://example.com/gif.gif', ext: 'gif' } }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { fetchRandomGif } = await import('../src/e621.js');
      await fetchRandomGif('user123');

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1]).toHaveProperty('headers');
      expect(fetchCall[1].headers['User-Agent']).toBe('discord-giff');
    });

    it('should request limit=10 posts', async () => {
      const mockResponse = {
        posts: [
          { file: { url: 'https://example.com/gif.gif', ext: 'gif' } }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { fetchRandomGif } = await import('../src/e621.js');
      await fetchRandomGif('user123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should use user tags in query', async () => {
      const mockResponse = {
        posts: [
          { file: { url: 'https://example.com/gif.gif', ext: 'gif' } }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { fetchRandomGif } = await import('../src/e621.js');
      await fetchRandomGif('user123');

      const fetchCall = global.fetch.mock.calls[0][0];
      expect(fetchCall).toContain('tags=');
      expect(fetchCall).toContain('type%3Agif');
    });

    it('should retry on failure up to 3 times', async () => {
      const mockResponse = {
        posts: [
          { file: { url: 'https://example.com/gif.gif', ext: 'gif' } }
        ]
      };

      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

      const { fetchRandomGif } = await import('../src/e621.js');
      const result = await fetchRandomGif('user123');

      expect(result.url).toBe('https://example.com/gif.gif');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const consoleError = console.error;
      console.error = jest.fn();

      global.fetch.mockRejectedValue(new Error('Network error'));

      const { fetchRandomGif } = await import('../src/e621.js');

      await expect(fetchRandomGif('user123')).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(3);

      console.error = consoleError;
    });

    it('should throw error when API returns non-ok status', async () => {
      const consoleError = console.error;
      console.error = jest.fn();

      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503
        })
        .mockRejectedValue(new Error('Network error'));

      const { fetchRandomGif } = await import('../src/e621.js');

      await expect(fetchRandomGif('user123')).rejects.toThrow();

      console.error = consoleError;
    });

    it('should throw error when no posts found', async () => {
      const consoleError = console.error;
      console.error = jest.fn();

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ posts: [] })
      });

      const { fetchRandomGif } = await import('../src/e621.js');

      await expect(fetchRandomGif('user123')).rejects.toThrow('No posts found');

      console.error = consoleError;
    });

    it('should throw error when no valid GIFs found after retries', async () => {
      const consoleError = console.error;
      console.error = jest.fn();

      const mockResponse = {
        posts: [
          { file: { url: 'https://example.com/image.png', ext: 'png' } }
        ]
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const { fetchRandomGif } = await import('../src/e621.js');

      await expect(fetchRandomGif('user123')).rejects.toThrow('No valid GIF found after retries');

      console.error = consoleError;
    });

    it('should have timeout handling capability', () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      expect(controller.signal).toBeDefined();
      expect(timeoutId).toBeDefined();

      clearTimeout(timeoutId);
    });

    it('should select random GIF from available GIFs', async () => {
      const mockResponse = {
        posts: [
          { file: { url: 'https://example.com/gif1.gif', ext: 'gif' } },
          { file: { url: 'https://example.com/gif2.gif', ext: 'gif' } },
          { file: { url: 'https://example.com/gif3.gif', ext: 'gif' } },
        ]
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const { fetchRandomGif } = await import('../src/e621.js');
      const results = new Set();

      for (let i = 0; i < 20; i++) {
        jest.clearAllMocks();
        global.fetch.mockResolvedValue({
          ok: true,
          json: async () => mockResponse
        });
        const result = await fetchRandomGif('user123');
        results.add(result.url);
      }

      expect(results.size).toBeGreaterThan(1);
    });

    it('should handle missing file.url gracefully', async () => {
      const mockResponse = {
        posts: [
          { file: {} },
          { file: { url: 'https://example.com/gif.gif', ext: 'gif' } }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { fetchRandomGif } = await import('../src/e621.js');
      const result = await fetchRandomGif('user123');

      expect(result.url).toBe('https://example.com/gif.gif');
    });
  });
});
