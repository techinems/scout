"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";
import { formatPhone, formatPhoneAsTyped } from "@/lib/phone";

/**
 * Phone field that formats US numbers as (xxx) xxx-xxxx while typing.
 * Reformats only when the caret is at the end, so editing the middle of a
 * number doesn't make the cursor jump; the final cleanup happens on blur
 * (and again on the server when saved).
 */
export function PhoneInput({
  name,
  defaultValue = "",
  placeholder = "(555) 555-0100",
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Input
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        const el = e.target;
        const atEnd = el.selectionStart === el.value.length;
        // Deleting a formatting character ("(508) " → "(508)") must not snap
        // straight back, or backspace would appear to do nothing.
        const deleting = el.value.length < value.length;
        setValue(atEnd && !deleting ? formatPhoneAsTyped(el.value) : el.value);
      }}
      onBlur={() => setValue((v) => formatPhone(v))}
    />
  );
}
