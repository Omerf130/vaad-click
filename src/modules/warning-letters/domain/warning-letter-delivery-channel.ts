export const WarningLetterDeliveryChannel = {
  WHATSAPP_MANUAL: "whatsapp_manual",
  EMAIL_MANUAL: "email_manual",
  SMS_MANUAL: "sms_manual",
  REGISTERED_MAIL: "registered_mail",
  PERSONAL_DELIVERY: "personal_delivery",
  OTHER_MANUAL: "other_manual",
  /** @deprecated integration placeholders — not selectable */
  SMS_DEFERRED: "sms_deferred",
  EMAIL_DEFERRED: "email_deferred",
} as const;

export type WarningLetterDeliveryChannel =
  (typeof WarningLetterDeliveryChannel)[keyof typeof WarningLetterDeliveryChannel];

export const WARNING_LETTER_MANUAL_DELIVERY_CHANNELS: readonly WarningLetterDeliveryChannel[] = [
  WarningLetterDeliveryChannel.WHATSAPP_MANUAL,
  WarningLetterDeliveryChannel.EMAIL_MANUAL,
  WarningLetterDeliveryChannel.SMS_MANUAL,
  WarningLetterDeliveryChannel.REGISTERED_MAIL,
  WarningLetterDeliveryChannel.PERSONAL_DELIVERY,
  WarningLetterDeliveryChannel.OTHER_MANUAL,
];

export function formatWarningLetterDeliveryChannelHe(
  channel: WarningLetterDeliveryChannel,
): string {
  switch (channel) {
    case WarningLetterDeliveryChannel.WHATSAPP_MANUAL:
      return "ווטסאפ (ידני)";
    case WarningLetterDeliveryChannel.EMAIL_MANUAL:
      return "דוא\"ל (ידני)";
    case WarningLetterDeliveryChannel.SMS_MANUAL:
      return "SMS (ידני)";
    case WarningLetterDeliveryChannel.REGISTERED_MAIL:
      return "דואר רשום";
    case WarningLetterDeliveryChannel.PERSONAL_DELIVERY:
      return "מסירה אישית";
    case WarningLetterDeliveryChannel.OTHER_MANUAL:
      return "אחר (ידני)";
    case WarningLetterDeliveryChannel.SMS_DEFERRED:
      return "SMS — אינטגרציה נדחית";
    case WarningLetterDeliveryChannel.EMAIL_DEFERRED:
      return "דוא\"ל — אינטגרציה נדחית";
    default:
      return channel;
  }
}

export function isManualWarningLetterDeliveryChannel(
  channel: WarningLetterDeliveryChannel,
): boolean {
  return (WARNING_LETTER_MANUAL_DELIVERY_CHANNELS as readonly string[]).includes(channel);
}