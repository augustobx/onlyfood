import { buildDeliveryAddress, isDeliveryAddressValid, type DeliveryAddressParts } from "@/lib/checkout-presentation";

export const MAX_SAVED_ADDRESSES = 5;

export type ClientSavedAddressData = DeliveryAddressParts & {
  label: string;
};

export function normalizedAddress(data: ClientSavedAddressData): ClientSavedAddressData {
  return {
    label: data.label.trim().replace(/\s+/g, " "),
    street: data.street.trim().replace(/\s+/g, " "),
    unit: data.unit.trim().replace(/\s+/g, " "),
    reference: data.reference.trim().replace(/\s+/g, " "),
  };
}

export function isSavedAddressValid(value: ClientSavedAddressData): boolean {
  const v = normalizedAddress(value);
  return v.label.length >= 1 && v.label.length <= 40
    && v.street.length >= 5 && v.street.length <= 180
    && v.unit.length <= 60 && v.reference.length <= 80
    && isDeliveryAddressValid(buildDeliveryAddress(v));
}

export function addressLabel(name: string): string {
  return name === "CASA" ? "Casa" : name === "TRABAJO" ? "Trabajo" : name;
}
