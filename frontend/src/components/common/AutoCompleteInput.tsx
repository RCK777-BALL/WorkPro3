/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Controller,
  Control,
  RegisterOptions,
  ControllerRenderProps,
  ControllerFieldState,
} from "react-hook-form";

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

interface AutoCompleteFieldProps {
  label: string;
  placeholder: string;
  fetchOptions: (q: string) => Promise<Option[]>;
  field: ControllerRenderProps;
  fieldState: ControllerFieldState;
}

const AutoCompleteField: React.FC<AutoCompleteFieldProps> = ({
  label,
  placeholder,
  fetchOptions,
  field,
  fieldState,
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [show, setShow] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  const cacheRef = useRef<Record<string, Option>>({});

  const rememberOptions = useCallback((list: Option[]) => {
    if (!list.length) return;
    cacheRef.current = { ...cacheRef.current };
    list.forEach((opt) => {
      cacheRef.current[opt.id] = opt;
    });
  }, []);

  useEffect(() => {
    if (!show) return;
    const handler = setTimeout(async () => {
      try {
        const res = await fetchOptions(inputValue);
        setOptions(res);
        rememberOptions(res);
      } catch {
        setOptions([]);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [fetchOptions, inputValue, rememberOptions, show]);

  useEffect(() => {
    if (isManualInput) return;
    const value = (field.value as string) || "";
    if (!value) {
      setInputValue("");
      return;
    }

    const cached = cacheRef.current[value];
    if (cached) {
      setInputValue(cached.name);
      return;
    }

    let active = true;
    fetchOptions("")
      .then((res) => {
        if (!active) return;
        rememberOptions(res);
        const match = res.find((opt) => opt.id === value || opt.name === value);
        setInputValue(match ? match.name : value);
      })
      .catch(() => {
        if (active) setInputValue(value);
      });

    return () => {
      active = false;
    };
  }, [fetchOptions, field.value, isManualInput, rememberOptions]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">{label}</label>
      <input
        className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
        value={inputValue}
        placeholder={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;
          setIsManualInput(true);
          setInputValue(value);
          setShow(true);
          if (!value) {
            field.onChange("");
          }
        }}
        onFocus={() => {
          setShow(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setShow(false);
            setIsManualInput(false);
            if (!field.value) {
              setInputValue("");
            }
          }, 100);
        }}
      />
      {fieldState.error && (
        <p className="text-error-500 dark:text-error-400 text-sm mt-1">{fieldState.error.message}</p>
      )}
      {show && options.length > 0 && (
        <ul className="absolute z-10 bg-white border border-neutral-300 mt-1 rounded-md shadow max-h-40 overflow-auto w-full dark:bg-neutral-800 dark:border-neutral-600">
          {options.map((opt) => (
            <li
              key={opt.id}
              className="px-2 py-1 cursor-pointer text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
              onMouseDown={() => {
                setIsManualInput(false);
                field.onChange(opt.id);
                setInputValue(opt.name);
                setShow(false);
              }}
            >
              {opt.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AutoCompleteInput: React.FC<Props> = ({
  name,
  label,
  control,
  fetchOptions,
  rules,
  placeholder,
}) => {
  const controllerRules = rules ? (rules as RegisterOptions) : undefined;

  return (
    <Controller
      name={name}
      control={control}
      {...(controllerRules ? { rules: controllerRules } : {})}
      render={({ field, fieldState }) => (
        <AutoCompleteField
          label={label}
          placeholder={placeholder ?? ""}
          fetchOptions={fetchOptions}
          field={field}
          fieldState={fieldState}
        />
      )}
    />
  );
};

export default AutoCompleteInput;
