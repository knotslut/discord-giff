import 'dotenv/config';

const discordRequest = async (endpoint, options) => {
  const res = await fetch(`https://discord.com/api/v10/${endpoint}`, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) throw new Error(await res.text());
  return res;
};

const commands = [
  {
    name: 'send',
    description: 'GIF',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: 'config',
    description: 'Manage search tags',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  }
];

discordRequest(`applications/${process.env.APP_ID}/commands`, {
  method: 'PUT',
  body: commands,
}).catch(console.error);
