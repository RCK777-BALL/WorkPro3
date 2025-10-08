/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from "react";
import { Controller, Control, RegisterOptions } from "react-hook-form";

interface Option {
  id: string;
  name: string;
}

interface Props {
  name: string;
  label: string;
  control: Control<any>;
  fetchOptions: (q: string) => Promise<Option[]>;
  rules?: RegisterOptions;
  placeholder?: string;
}

const AutoCompleteInput: React.FC<Props> = ({
  name,
  label,
  control,
  fetchOptions,
  rules,
  placeholder,
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show || query.length === 0) return;
    const handler = setTimeout(async () => {
      try {
        const res = await fetchOptions(query);
        setOptions(res);
      } catch {
        setOptions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query, show, fetchOptions]);

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className="relative">
          <label className="block text-sm font-medium mb-1">{label}</label>
          <input
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={query}
            placeholder={placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setQuery(e.target.value);
              setShow(true);
            }}
            onBlur={() => {
              setTimeout(() => setShow(false), 100);
            }}
          />
          {fieldState.error && (
            <p className="text-error-500 text-sm mt-1">
              {fieldState.error.message}
            </p>
          )}
          {show && options.length > 0 && (
            <ul className="absolute z-10 bg-white border border-neutral-300 mt-1 rounded-md shadow max-h-40 overflow-auto w-full">
              {options.map((opt) => (
                <li
                  key={opt.id}
                  className="px-2 py-1 cursor-pointer hover:bg-neutral-100"
                  onMouseDown={() => {
                    field.onChange(opt.id);
                    setQuery(opt.name);
                    setShow(false);
                  }}
                >
                  {opt.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    />
  );
};

export default AutoCompleteInput;
