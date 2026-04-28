import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../../styles/searchableDropdown.css";

export interface DropdownOption {
  id: string | number;
  label: string;
  value?: string;
}

export interface Props {
  options: DropdownOption[];
  value?: DropdownOption | null;
  placeholder?: string;
  onSelect: (option: DropdownOption | null) => void;
  width?: number;
}

const SearchableDropdown = ({
  options,
  placeholder = "Search...",
  value,
  onSelect,
  width = 280,
}: Props) => {
  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null); // ✅ NEW

  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();

      setMenuStyle({
        position: "absolute",
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 99999,
      });
    }
  }, [open]);

  const filtered = open
    ? options
    : options.filter((o) =>
      o.label.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <div
      className="searchable-dropdown"
      style={{ width }}
      ref={containerRef}
    >
      <div className="dropdown-input-wrapper">
        <input
          ref={inputRef}
          className="dropdown-input"
          placeholder={placeholder}
          value={query || value?.label || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="dropdown-menu"
            style={menuStyle}
          >
            {filtered.length === 0 && (
              <div className="dropdown-empty">No results</div>
            )}

            {filtered.map((o) => (
              <div
                key={o.id}
                className="dropdown-item"
                onClick={() => {
                  onSelect(o);           // ✅ now fires correctly
                  setQuery(o.label);
                  setOpen(false);
                }}
              >
                {o.label}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableDropdown;
