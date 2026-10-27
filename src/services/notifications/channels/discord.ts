export const sendDiscordWebhook = async (
  webhookUrl: string,
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      embeds: [
        {
          title,
          description: body,
          color: 3719416, // Slate / Sky accent
          footer: { text: 'FlightSentry' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 204) {
      return { success: true };
    }

    const errText = await res.text();
    return { success: false, error: `Discord HTTP ${res.status}: ${errText}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Discord request failed' };
  }
};