export type NotificationChannel = 'discord' | 'slack' | 'generic' | 'smtp';

export interface ChannelDispatchResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}