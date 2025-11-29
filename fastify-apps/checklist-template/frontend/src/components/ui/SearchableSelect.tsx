import { useMemo } from "react";
import Select, { components } from "react-select";
import type { StylesConfig } from "react-select";
import Fuse from "fuse.js";

export type SearchableOption = {
  value: string;
  label: string;
  subLabel?: string;
};

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  disabled?: boolean;
  searchKeys?: string[];
  className?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  searchKeys = ["label", "value", "subLabel"],
  className = "",
}: SearchableSelectProps) {
  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(options, {
        keys: searchKeys,
        threshold: 0.3, // Lower = more strict matching
        distance: 100,
        includeScore: true,
        minMatchCharLength: 1,
      }),
    [options, searchKeys]
  );

  // Custom filter function using Fuse.js
  const filterOption = (option: { data: SearchableOption }, inputValue: string) => {
    if (!inputValue) return true;

    const results = fuse.search(inputValue);
    return results.some((result) => result.item.value === option.data.value);
  };

  // Find the selected option object
  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Custom styles to match Tailwind design system
  const customStyles: StylesConfig<SearchableOption, false> = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? "#6366f1" : "#e5e7eb",
      borderRadius: "0.5rem",
      padding: "0.125rem",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(99, 102, 241, 0.5)" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
      },
      backgroundColor: state.isDisabled ? "#f5f5f5" : "white",
      cursor: state.isDisabled ? "not-allowed" : "default",
    }),
    input: (base) => ({
      ...base,
      color: "#171717",
      fontSize: "0.875rem",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
      fontSize: "0.875rem",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#171717",
      fontSize: "0.875rem",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused
        ? "#eef2ff"
        : state.isSelected
        ? "#6366f1"
        : "white",
      color: state.isSelected ? "white" : "#171717",
      cursor: "pointer",
      fontSize: "0.875rem",
      "&:active": {
        backgroundColor: "#6366f1",
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.5rem",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      border: "1px solid #e5e7eb",
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.25rem",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isDisabled ? "#d1d5db" : "#6b7280",
      "&:hover": {
        color: "#6366f1",
      },
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: "#e5e7eb",
    }),
  };

  // Custom option component to show subLabel
  const CustomOption = (props: any) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div>
          <div>{data.label}</div>
          {data.subLabel && (
            <div className="text-xs text-neutral-500">({data.subLabel})</div>
          )}
        </div>
      </components.Option>
    );
  };

  // Custom single value component to show subLabel
  const CustomSingleValue = (props: any) => {
    const { data } = props;
    return (
      <components.SingleValue {...props}>
        <span>
          {data.label}
          {data.subLabel && <span className="text-neutral-500"> ({data.subLabel})</span>}
        </span>
      </components.SingleValue>
    );
  };

  return (
    <Select<SearchableOption>
      value={selectedOption}
      onChange={(option) => onChange(option?.value || "")}
      options={options}
      placeholder={placeholder}
      isDisabled={disabled}
      isClearable={false}
      isSearchable={true}
      filterOption={filterOption}
      styles={customStyles}
      components={{
        Option: CustomOption,
        SingleValue: CustomSingleValue,
      }}
      className={className}
    />
  );
}
