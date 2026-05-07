import { contacts } from "./mock";
import { wrap, wrapList } from "./client";
import type { Contact } from "./types";

export const listContacts = () => wrapList<Contact>(contacts);
export const getContact = (id: string) => {
  const c = contacts.find((x) => x.id === id);
  return c ? wrap(c) : { data: null as Contact | null, error: { code: "not_found", message: id } };
};
export const updateContact = (id: string, patch: Partial<Contact>) => {
  const c = contacts.find((x) => x.id === id);
  return c ? wrap({ ...c, ...patch }) : { data: null as Contact | null, error: { code: "not_found", message: id } };
};