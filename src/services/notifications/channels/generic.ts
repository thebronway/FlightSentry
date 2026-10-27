export const sendGenericWebhook = async (
  webhookUrl: string,
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      title,
      body,
      message: body,
      format: 'markdown',
      type: 'info',
      timestamp: new Date().toISOString(),
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
    return { success: false, error: `Generic Webhook HTTP ${res.status}: ${errText}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Generic webhook request failed' };
  }
};