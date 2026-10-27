import { transferSettingsValid } from "./transfer-payment";
import { parseBusinessHours } from "./business-hours";
type LaunchConfig = {
  allowImmediateOrders?: boolean; allowScheduledTomorrow?: boolean; allowAdvanceOrders?: boolean;
  autoScheduleEnabled?: boolean; businessHours?: string | null;
  paymentCash?: boolean; paymentMp?: boolean; paymentTransfer?: boolean;
  transferAlias?: string; transferCbu?: string; transferHolder?: string; transferWhatsApp?: string;
};
export function launchReadiness(config: LaunchConfig | null, activeSlots: number, mercadoPagoConfigured: boolean) {
  if (!config) return { scheduling: false, payments: false };
  const mode = Boolean(config.allowImmediateOrders || config.allowScheduledTomorrow || config.allowAdvanceOrders);
  const scheduling = mode && (!config.allowImmediateOrders || activeSlots > 0) &&
    (!config.autoScheduleEnabled || Boolean(config.businessHours && parseBusinessHours(config.businessHours).some(day => day.isOpen && day.shift1Open && day.shift1Close)));
  const transfer = transferSettingsValid({ enabled: Boolean(config.paymentTransfer), alias: config.transferAlias || "", cbu: config.transferCbu || "", holder: config.transferHolder || "", whatsapp: config.transferWhatsApp || "" });
  const payments = Boolean(config.paymentCash || config.paymentMp || config.paymentTransfer) &&
    (!config.paymentMp || mercadoPagoConfigured) && (!config.paymentTransfer || transfer);
  return { scheduling, payments };
}
