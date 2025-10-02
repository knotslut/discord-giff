import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { fetchRandomGif } from './e621.js';
import { getConfig, addTag, removeTag, resetTags } from './config.js';

const app = express();
const PORT = process.env.PORT || 3000;

const editInteractionResponse = async (interactionToken, responseData) => {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${interactionToken}/messages/@original`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData)
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to edit interaction response:', res.status, errorText);
      throw new Error(`Failed to edit interaction: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error editing interaction response:', error);
    throw error;
  }
};

const createRefreshButton = (userId) => ({
  type: MessageComponentTypes.ACTION_ROW,
  components: [{
    type: MessageComponentTypes.BUTTON,
    style: ButtonStyleTypes.PRIMARY,
    custom_id: `refresh_${userId}`,
    label: 'Refresh'
  }]
});

const createConfigButtons = (userId) => {
  const buttons = [
    {
      type: MessageComponentTypes.BUTTON,
      style: ButtonStyleTypes.PRIMARY,
      custom_id: `config_add_${userId}`,
      label: 'Add Tag'
    },
    {
      type: MessageComponentTypes.BUTTON,
      style: ButtonStyleTypes.SECONDARY,
      custom_id: `config_view_${userId}`,
      label: 'Refresh'
    },
    {
      type: MessageComponentTypes.BUTTON,
      style: ButtonStyleTypes.DANGER,
      custom_id: `config_reset_${userId}`,
      label: 'Reset to Defaults'
    }
  ];

  return {
    type: MessageComponentTypes.ACTION_ROW,
    components: buttons
  };
};

const createTagsDisplay = (tags) => {
  const tagsList = tags.length > 0
    ? tags.map(tag => `\`${tag}\``).join('\n')
    : 'No tags configured';

  return {
    type: MessageComponentTypes.TEXT_DISPLAY,
    content: `**Current Tags**\n${tagsList}`
  };
};

const createTagSelectMenu = (tags, userId) => {
  if (tags.length === 0) return null;

  return {
    type: MessageComponentTypes.ACTION_ROW,
    components: [{
      type: MessageComponentTypes.STRING_SELECT,
      custom_id: `tag_select_${userId}`,
      placeholder: 'Select a tag to remove',
      options: tags.slice(0, 25).map(tag => ({
        label: tag.length > 100 ? tag.substring(0, 97) + '...' : tag,
        value: tag,
        description: 'Click to remove this tag'
      }))
    }]
  };
};

const errorResponse = (message, ephemeral = true) => ({
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    content: `**Error:** ${message}`,
    flags: ephemeral ? InteractionResponseFlags.EPHEMERAL : 0
  }
});

const configResponse = (tags, userId) => {
  const components = [createTagsDisplay(tags)];

  const selectMenu = createTagSelectMenu(tags, userId);
  if (selectMenu) {
    components.push(selectMenu);
  }

  components.push(createConfigButtons(userId));

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
      components
    }
  };
};

const configUpdateResponse = (tags, userId) => {
  const components = [createTagsDisplay(tags)];

  const selectMenu = createTagSelectMenu(tags, userId);
  if (selectMenu) {
    components.push(selectMenu);
  }

  components.push(createConfigButtons(userId));

  return {
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      components
    }
  };
};

const modalResponse = (customId, title, components) => ({
  type: InteractionResponseType.MODAL,
  data: {
    custom_id: customId,
    title,
    components
  }
});

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async (req, res) => {
  const { type, data, member, user, message } = req.body;
  const userId = member?.user?.id || user?.id || message?.interaction?.user?.id;

  if (!userId && type !== InteractionType.PING) {
    console.error('[interaction] Could not determine user ID from interaction');
    return res.status(400).json({ error: 'Could not determine user ID' });
  }

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND && data.name === 'config') {
    try {
      const { tags } = getConfig(userId);
      return res.send(configResponse(tags, userId));
    } catch (err) {
      console.error(`[/config] Error for user ${userId}:`, err);
      return res.send(errorResponse(err.message));
    }
  }

  if (type === InteractionType.APPLICATION_COMMAND && data.name === 'send') {
    res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });

    const interactionToken = req.body.token;

    try {
      const gif = await fetchRandomGif(userId);

      await editInteractionResponse(interactionToken, {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
        components: [
          {
            type: MessageComponentTypes.MEDIA_GALLERY,
            items: [{ media: { url: gif.url } }]
          },
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: `\`\`\`\n${gif.url}\n\`\`\``
          },
          createRefreshButton(userId)
        ]
      });
    } catch (err) {
      console.error(`[/send] Error for user ${userId}:`, err);
      await editInteractionResponse(interactionToken, {
        content: `**Error:** ${err.message}`,
        flags: InteractionResponseFlags.EPHEMERAL
      }).catch(e => console.error('[/send] Failed to send error message:', e));
    }
    return;
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    const customId = data.custom_id;

    if (customId?.startsWith('refresh_')) {
      res.send({
        type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE
      });

      const interactionToken = req.body.token;

      try {
        const gif = await fetchRandomGif(userId);

        await editInteractionResponse(interactionToken, {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.MEDIA_GALLERY,
              items: [{ media: { url: gif.url } }]
            },
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `\`\`\`\n${gif.url}\n\`\`\``
            },
            createRefreshButton(userId)
          ]
        });
      } catch (err) {
        console.error(`[refresh] Error for user ${userId}:`, err);
        await editInteractionResponse(interactionToken, {
          content: `**Error:** ${err.message}`,
          components: [createRefreshButton(userId)]
        }).catch(e => console.error('[refresh] Failed to send error message:', e));
      }
      return;
    }

    if (customId?.startsWith('config_view_')) {
      try {
        const { tags } = getConfig(userId);
        return res.send(configUpdateResponse(tags, userId));
      } catch (err) {
        console.error(`[config_view] Error for user ${userId}:`, err);
        return res.send(errorResponse(err.message));
      }
    }

    if (customId?.startsWith('config_reset_')) {
      try {
        const { tags } = resetTags(userId);
        return res.send(configUpdateResponse(tags, userId));
      } catch (err) {
        console.error(`[config_reset] Error for user ${userId}:`, err);
        return res.send(errorResponse(err.message));
      }
    }

    if (customId?.startsWith('config_add_')) {
      return res.send(modalResponse(`add_tag_modal_${userId}`, 'Add Tag', [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [{
            type: MessageComponentTypes.INPUT_TEXT,
            custom_id: 'tag_input',
            style: 1,
            label: 'Tag',
            placeholder: 'Enter tag to add',
            required: true,
            max_length: 100
          }]
        }
      ]));
    }

    if (customId?.startsWith('tag_select_')) {
      try {
        const selectedTag = data.values[0];
        const { tags } = removeTag(userId, selectedTag);
        return res.send(configUpdateResponse(tags, userId));
      } catch (err) {
        console.error(`[tag_select] Error for user ${userId}:`, err);
        return res.send(errorResponse(err.message));
      }
    }
  }

  if (type === InteractionType.MODAL_SUBMIT) {
    const customId = data.custom_id;

    if (customId?.startsWith('add_tag_modal_')) {
      try {
        const tagInput = data.components[0].components[0].value;
        const { tags } = addTag(userId, tagInput);
        return res.send(configResponse(tags, userId));
      } catch (err) {
        console.error(`[add_tag_modal] Error for user ${userId}:`, err);
        return res.send(errorResponse(err.message));
      }
    }
  }

  console.error(`[unknown] Unknown interaction type ${type} from user ${userId}`);
  return res.status(400).json({ error: 'unknown interaction' });
});

app.listen(PORT, () => {});
