export const sendSlackWebhook = async (
  webhookUrl: string,
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      text: `*${title}*\n\n${body}`,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true };
    }

    const errText = await res.text();
    return { success: false, error: `Slack HTTP ${res.status}: ${errText}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Slack request failed' };
  }
};