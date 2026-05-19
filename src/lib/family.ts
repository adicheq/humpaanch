// Family helper. Single-tenant for now (Soni Family). Multi-tenant ready.

export const SONI_FAMILY_ID = "00000000-0000-0000-0000-000000000001";

export function getDefaultFamilyId(): string {
  return process.env.DEFAULT_FAMILY_ID || SONI_FAMILY_ID;
}
