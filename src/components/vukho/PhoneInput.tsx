import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Phone, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { listBackendContacts, type ContactListItem } from "@/lib/api/contacts";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

let _cache: { promise: Promise<ContactListItem[]> | null; data: ContactListItem[] | null } = {
  promise: null,
  data: null,
};

function fetchContactsCached(): Promise<ContactListItem[]> {
  if (_cache.data) return Promise.resolve(_cache.data);
  if (_cache.promise) return _cache.promise;
  _cache.promise = listBackendContacts(100)
    .then((res) => {
      _cache.data = res.data;
      return res.data;
    })
    .catch((err) => {
      _cache.promise = null;
      throw err;
    });
  return _cache.promise;
}

export function invalidateContactsCache() {
  _cache = { promise: null, data: null };
}

export function PhoneInput({ value, onChange, placeholder = "+15551234567", className, disabled, id, name }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactListItem[]>(_cache.data ?? []);
  const [loading, setLoading] = useState(!_cache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (_cache.data) {
      setContacts(_cache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchContactsCached()
      .then((data) => {
        if (!cancelled) {
          setContacts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load contacts");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const matched = useMemo(
    () => contacts.find((c) => c.phone.replace(/\s+/g, "") === value.replace(/\s+/g, "")),
    [contacts, value]
  );

  return (
    <div className={cn("relative flex items-center gap-1.5", className)}>
      <div className="relative flex-1">
        <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-10 pl-9 pr-3 font-mono text-sm"
        />
        {matched?.name && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 max-w-[40%] truncate rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            {matched.name}
          </span>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Pick from contacts"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border bg-surface px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Users className="h-3.5 w-3.5" />
            Contacts
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[320px] p-0" sideOffset={6}>
          <Command shouldFilter>
            <CommandInput placeholder="Search by name or number..." className="h-9" />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading contacts...
                </div>
              )}
              {!loading && error && (
                <div className="px-3 py-4 text-xs text-destructive">{error}</div>
              )}
              {!loading && !error && contacts.length === 0 && (
                <CommandEmpty>No contacts yet. Type a number above.</CommandEmpty>
              )}
              {!loading && !error && contacts.length > 0 && (
                <>
                  <CommandEmpty>No matching contact.</CommandEmpty>
                  <CommandGroup heading="Saved contacts">
                    {contacts.map((c) => {
                      const isActive = matched?.id === c.id;
                      return (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.phone}`}
                          onSelect={() => {
                            onChange(c.phone);
                            setOpen(false);
                          }}
                          className="flex items-center gap-2.5 py-2"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium leading-tight">{c.name}</div>
                            <div className="truncate font-mono text-[11px] text-muted-foreground">{c.phone}</div>
                          </div>
                          {isActive && <Check className="h-3.5 w-3.5 text-success" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}