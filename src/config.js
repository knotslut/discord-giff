import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const CONFIG_FILE = join(DATA_DIR, 'user-configs.json');

const defaultTags = [
  'order:random',
  'score:>2000',
  '-female',
  '-intersex',
  '-vulva',
  '-comic',
  '-sukendo',
  '-dagasi',
  '-feral',
  'type:gif',
  'animated',
  'male/male'
];

let userConfigs = new Map();

const loadConfigs = () => {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      userConfigs = new Map(Object.entries(data));
    }
  } catch (err) {
    console.error('Failed to load user configs:', err.message);
  }
};

const saveConfigs = () => {
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = Object.fromEntries(userConfigs);
    writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save user configs:', err.message);
  }
};

loadConfigs();

const getUserConfig = (userId) => {
  if (!userConfigs.has(userId)) {
    userConfigs.set(userId, { tags: [...defaultTags] });
    saveConfigs();
  }
  return userConfigs.get(userId);
};

export const getConfig = (userId) => getUserConfig(userId);

export const setTags = (userId, tags) => {
  const config = getUserConfig(userId);
  config.tags = tags.filter(tag => tag && tag.trim());
  saveConfigs();
  return config;
};

export const addTag = (userId, tag) => {
  const config = getUserConfig(userId);
  const trimmedTag = tag.trim();
  if (trimmedTag && !config.tags.includes(trimmedTag)) {
    config.tags.push(trimmedTag);
    saveConfigs();
  }
  return config;
};

export const removeTag = (userId, tag) => {
  const config = getUserConfig(userId);
  config.tags = config.tags.filter(t => t !== tag);
  saveConfigs();
  return config;
};

export const resetTags = (userId) => {
  const config = getUserConfig(userId);
  config.tags = [...defaultTags];
  saveConfigs();
  return config;
};
