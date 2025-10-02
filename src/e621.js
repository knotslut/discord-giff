import { getConfig } from './config.js';

export const fetchRandomGif = async (userId, maxRetries = 3) => {
  const { tags } = getConfig(userId);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(
        `https://e621.net/posts.json?tags=${encodeURIComponent(tags.join(' '))}&limit=10`,
        {
          headers: { 'User-Agent': 'discord-giff' },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      if (!data.posts?.length) throw new Error('No posts found');

      const validGifs = data.posts.filter(post =>
        post.file?.url && post.file.ext === 'gif'
      );

      if (validGifs.length > 0) {
        const randomPost = validGifs[Math.floor(Math.random() * validGifs.length)];
        return { url: randomPost.file.url };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`e621 API timeout on attempt ${i + 1}/${maxRetries}`);
      } else {
        console.error(`e621 API error on attempt ${i + 1}/${maxRetries}:`, error.message);
      }
      if (i === maxRetries - 1) throw error;
    }
  }

  throw new Error('No valid GIF found after retries');
};
