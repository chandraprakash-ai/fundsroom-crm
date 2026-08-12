import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  variant?: 'default' | 'minimal';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  style,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const isMinimal = variant === 'minimal';

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        ...style
      }}
    >
      <div
        className={isMinimal ? '' : 'form-input'}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: isMinimal ? 'transparent' : (disabled ? '#f3f4f6' : '#ffffff'),
          color: selectedOption ? 'inherit' : 'var(--gray-400)',
          minHeight: isMinimal ? 'auto' : '38px',
          padding: isMinimal ? '0.2rem 0.5rem' : '0.5rem 0.875rem',
          border: isMinimal ? 'none' : undefined,
          borderRadius: isMinimal ? '0' : undefined,
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={isMinimal ? 12 : 16} style={{ color: 'var(--gray-400)', marginLeft: '0.25rem' }} />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 1000,
            marginTop: '0.25rem',
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '0.625rem 1rem', fontSize: '0.825rem', color: 'var(--gray-400)' }}>
              No options available
            </div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.value}
                style={{
                  padding: '0.625rem 1rem',
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  backgroundColor: value === opt.value ? 'var(--gray-100)' : 'transparent',
                  color: value === opt.value ? 'var(--gray-900)' : 'var(--gray-700)',
                  fontWeight: value === opt.value ? 600 : 400,
                }}
                className="hover-bg-gray"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
