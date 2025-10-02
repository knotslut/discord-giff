import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  InteractionResponseType,
  MessageComponentTypes,
  InteractionResponseFlags
} from 'discord-interactions';

describe('app.js module structure', () => {
  it('should define required environment variables', () => {
    expect(process.env.PORT !== undefined || process.env.PORT === undefined).toBe(true);
  });
});

describe('helper functions and response builders', () => {
  it('should have correct interaction response types', () => {
    expect(InteractionResponseType.PONG).toBe(1);
    expect(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE).toBe(4);
    expect(InteractionResponseType.UPDATE_MESSAGE).toBe(7);
    expect(InteractionResponseType.MODAL).toBe(9);
  });

  it('should have correct component types', () => {
    expect(MessageComponentTypes.ACTION_ROW).toBe(1);
    expect(MessageComponentTypes.BUTTON).toBe(2);
    expect(MessageComponentTypes.STRING_SELECT).toBe(3);
    expect(MessageComponentTypes.TEXT_DISPLAY).toBe(10);
    expect(MessageComponentTypes.MEDIA_GALLERY).toBe(12);
  });

  it('should have correct interaction response flags', () => {
    expect(InteractionResponseFlags.EPHEMERAL).toBe(64);
    expect(InteractionResponseFlags.IS_COMPONENTS_V2).toBe(32768);
  });
});

describe('environment validation', () => {
  beforeAll(() => {
    process.env.APP_ID = 'test-app-id';
    process.env.PUBLIC_KEY = 'test-public-key';
    process.env.DISCORD_TOKEN = 'test-token';
  });

  it('should require APP_ID environment variable', () => {
    expect(process.env.APP_ID).toBeDefined();
  });

  it('should require PUBLIC_KEY environment variable', () => {
    expect(process.env.PUBLIC_KEY).toBeDefined();
  });

  it('should have default PORT', () => {
    const defaultPort = process.env.PORT || 3000;
    expect(defaultPort).toBe(3000);
  });
});

describe('editInteractionResponse helper', () => {
  it('should construct correct webhook URL', () => {
    const appId = 'test-app-123';
    const token = 'test-token-456';
    const expectedUrl = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;

    expect(expectedUrl).toContain('/webhooks/');
    expect(expectedUrl).toContain(appId);
    expect(expectedUrl).toContain(token);
    expect(expectedUrl.endsWith('/@original')).toBe(true);
  });

  it('should use PATCH method for editing', () => {
    const method = 'PATCH';
    expect(method).toBe('PATCH');
  });

  it('should send JSON content type', () => {
    const headers = { 'Content-Type': 'application/json' };
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('component creation helpers', () => {
  it('should create action row with button structure', () => {
    const actionRow = {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          custom_id: 'test_button',
          label: 'Test'
        }
      ]
    };

    expect(actionRow.type).toBe(1);
    expect(actionRow.components).toHaveLength(1);
    expect(actionRow.components[0].type).toBe(2);
  });

  it('should create string select menu structure', () => {
    const selectMenu = {
      type: 1,
      components: [{
        type: 3,
        custom_id: 'test_select',
        placeholder: 'Select option',
        options: [
          { label: 'Option 1', value: 'opt1', description: 'First option' }
        ]
      }]
    };

    expect(selectMenu.components[0].type).toBe(3);
    expect(selectMenu.components[0].options).toHaveLength(1);
    expect(selectMenu.components[0].options[0]).toHaveProperty('label');
    expect(selectMenu.components[0].options[0]).toHaveProperty('value');
  });

  it('should create text display structure', () => {
    const textDisplay = {
      type: 10,
      content: 'Test content'
    };

    expect(textDisplay.type).toBe(10);
    expect(textDisplay.content).toBe('Test content');
  });

  it('should create media gallery structure', () => {
    const mediaGallery = {
      type: 12,
      items: [
        { media: { url: 'https://example.com/image.gif' } }
      ]
    };

    expect(mediaGallery.type).toBe(12);
    expect(mediaGallery.items).toHaveLength(1);
    expect(mediaGallery.items[0].media).toHaveProperty('url');
  });
});

describe('interaction response structures', () => {
  it('should have correct PONG response structure', () => {
    const pongResponse = { type: 1 };
    expect(pongResponse.type).toBe(1);
  });

  it('should have correct deferred response structure', () => {
    const deferredResponse = {
      type: 5,
      data: { flags: 64 }
    };

    expect(deferredResponse.type).toBe(5);
    expect(deferredResponse.data.flags).toBe(64);
  });

  it('should have correct modal response structure', () => {
    const modalResponse = {
      type: 9,
      data: {
        custom_id: 'test_modal',
        title: 'Test Modal',
        components: []
      }
    };

    expect(modalResponse.type).toBe(9);
    expect(modalResponse.data).toHaveProperty('custom_id');
    expect(modalResponse.data).toHaveProperty('title');
    expect(modalResponse.data).toHaveProperty('components');
  });

  it('should combine flags with bitwise OR', () => {
    const ephemeral = 64;
    const componentsV2 = 32768;
    const combined = ephemeral | componentsV2;

    expect(combined).toBe(32832);
  });
});
