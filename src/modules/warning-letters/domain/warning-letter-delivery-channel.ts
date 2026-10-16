export const WarningLetterDeliveryChannel = {
  WHATSAPP_MANUAL: "whatsapp_manual",
  REGISTERED_MAIL: "registered_mail",
  SMS_DEFERRED: "sms_deferred",
  EMAIL_DEFERRED: "email_deferred",
} as const;

export type WarningLetterDeliveryChannel =
  (typeof WarningLetterDeliveryChannel)[keyof typeof WarningLetterDeliveryChannel];

export function formatWarningLetterDeliveryChannelHe(
  channel: WarningLetterDeliveryChannel,
): string {
  switch (channel) {
    case WarningLetterDeliveryChannel.WHATSAPP_MANUAL:
      return "ווטסאפ — תיעוד ידני (ללא שליחה אוטומטית)";
    case WarningLetterDeliveryChannel.REGISTERED_MAIL:
      return "דואר רשום";
    case WarningLetterDeliveryChannel.SMS_DEFERRED:
      return "SMS — אינטגרציה נדחית";
    case WarningLetterDeliveryChannel.EMAIL_DEFERRED:
      return "דוא\"ל — אינטגרציה נדחית";
    default:
      return channel;
  }
}
