import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_CONFIG_FILE = join(__dirname, '..', 'data', 'user-configs.json');

describe('config.js', () => {
  beforeEach(() => {
    if (existsSync(TEST_CONFIG_FILE)) {
      unlinkSync(TEST_CONFIG_FILE);
    }
  });

  afterEach(() => {
    if (existsSync(TEST_CONFIG_FILE)) {
      unlinkSync(TEST_CONFIG_FILE);
    }
  });

  it('should export getConfig function', async () => {
    const { getConfig } = await import('../src/config.js');
    expect(typeof getConfig).toBe('function');
  });

  it('should export setTags function', async () => {
    const { setTags } = await import('../src/config.js');
    expect(typeof setTags).toBe('function');
  });

  it('should export addTag function', async () => {
    const { addTag } = await import('../src/config.js');
    expect(typeof addTag).toBe('function');
  });

  it('should export removeTag function', async () => {
    const { removeTag } = await import('../src/config.js');
    expect(typeof removeTag).toBe('function');
  });

  it('should export resetTags function', async () => {
    const { resetTags } = await import('../src/config.js');
    expect(typeof resetTags).toBe('function');
  });

  describe('getConfig', () => {
    it('should return default tags for new user', async () => {
      const { getConfig } = await import('../src/config.js');
      const config = getConfig('user123');

      expect(config).toBeDefined();
      expect(config.tags).toBeDefined();
      expect(Array.isArray(config.tags)).toBe(true);
      expect(config.tags.length).toBeGreaterThan(0);
      expect(config.tags).toContain('type:gif');
      expect(config.tags).toContain('animated');
    });

    it('should return same config for same user', async () => {
      const { getConfig } = await import('../src/config.js');
      const config1 = getConfig('user123');
      const config2 = getConfig('user123');

      expect(config1).toBe(config2);
    });

    it('should return different configs for different users', async () => {
      const { getConfig } = await import('../src/config.js');
      const config1 = getConfig('user123');
      const config2 = getConfig('user456');

      expect(config1).not.toBe(config2);
    });
  });

  describe('setTags', () => {
    it('should update user tags', async () => {
      const { getConfig, setTags } = await import('../src/config.js');
      const newTags = ['tag1', 'tag2', 'tag3'];

      const result = setTags('user123', newTags);

      expect(result.tags).toEqual(newTags);
      expect(getConfig('user123').tags).toEqual(newTags);
    });

    it('should filter out empty tags', async () => {
      const { setTags } = await import('../src/config.js');
      const newTags = ['tag1', '', 'tag2', '  ', 'tag3'];

      const result = setTags('user123', newTags);

      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should persist tags to file', async () => {
      const { setTags } = await import('../src/config.js');
      const newTags = ['tag1', 'tag2'];

      setTags('user123', newTags);

      expect(existsSync(TEST_CONFIG_FILE)).toBe(true);
    });
  });

  describe('addTag', () => {
    it('should add new tag to user config', async () => {
      const { getConfig, addTag } = await import('../src/config.js');
      const testUserId = 'addTagTest1';
      const initialLength = getConfig(testUserId).tags.length;

      const result = addTag(testUserId, 'newtag');

      expect(result.tags).toContain('newtag');
      expect(result.tags.length).toBe(initialLength + 1);
    });

    it('should not add duplicate tags', async () => {
      const { addTag, getConfig } = await import('../src/config.js');
      const config = getConfig('user123');
      const existingTag = config.tags[0];
      const initialLength = config.tags.length;

      addTag('user123', existingTag);

      expect(config.tags.length).toBe(initialLength);
    });

    it('should trim whitespace from tags', async () => {
      const { addTag } = await import('../src/config.js');

      const result = addTag('user123', '  trimmed  ');

      expect(result.tags).toContain('trimmed');
      expect(result.tags).not.toContain('  trimmed  ');
    });

    it('should not add empty tags', async () => {
      const { addTag, getConfig } = await import('../src/config.js');
      const initialLength = getConfig('user123').tags.length;

      addTag('user123', '   ');

      expect(getConfig('user123').tags.length).toBe(initialLength);
    });
  });

  describe('removeTag', () => {
    it('should remove tag from user config', async () => {
      const { getConfig, removeTag } = await import('../src/config.js');
      const testUserId = 'removeTagTest1';
      const config = getConfig(testUserId);
      const initialLength = config.tags.length;
      const tagToRemove = config.tags[0];

      const result = removeTag(testUserId, tagToRemove);

      expect(result.tags).not.toContain(tagToRemove);
      expect(result.tags.length).toBe(initialLength - 1);
    });

    it('should handle removing non-existent tag', async () => {
      const { getConfig, removeTag } = await import('../src/config.js');
      const initialLength = getConfig('user123').tags.length;

      removeTag('user123', 'nonexistent');

      expect(getConfig('user123').tags.length).toBe(initialLength);
    });
  });

  describe('resetTags', () => {
    it('should reset tags to defaults', async () => {
      const { getConfig, setTags, resetTags } = await import('../src/config.js');
      const testUserId = 'resetTagTest1';
      const defaultTags = [...getConfig(testUserId).tags];

      setTags(testUserId, ['custom1', 'custom2']);
      const result = resetTags(testUserId);

      expect(result.tags).toEqual(defaultTags);
    });

    it('should persist reset to file', async () => {
      const { setTags, resetTags } = await import('../src/config.js');

      setTags('user123', ['custom1']);
      resetTags('user123');

      expect(existsSync(TEST_CONFIG_FILE)).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist tags to file', async () => {
      const { setTags } = await import('../src/config.js');
      setTags('user123', ['persisted1', 'persisted2']);

      expect(existsSync(TEST_CONFIG_FILE)).toBe(true);
    });

    it('should handle missing config file gracefully', async () => {
      if (existsSync(TEST_CONFIG_FILE)) {
        unlinkSync(TEST_CONFIG_FILE);
      }

      const { getConfig } = await import('../src/config.js');
      const config = getConfig('user123');

      expect(config).toBeDefined();
      expect(config.tags).toBeDefined();
    });
  });
});
