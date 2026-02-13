import React, { useState, KeyboardEvent, ClipboardEvent } from 'react';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  transformTag?: (tag: string) => string; // Optional function to format/clean tag before adding
}

const TagInput: React.FC<TagInputProps> = ({ tags, setTags, disabled, placeholder, transformTag }) => {
  const [inputValue, setInputValue] = useState('');

  const addTags = (values: string[]) => {
    const newTags = values
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => transformTag ? transformTag(t) : t) // Apply transformation (e.g., extract ID from URL)
      .filter(t => !tags.includes(t));

    if (newTags.length > 0) {
      setTags([...tags, ...newTags]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTags([inputValue]);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    // Split by newlines or commas
    const pastedTags = pasteData.split(/[\n,]+/).map(t => t.trim());
    addTags(pastedTags);
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div 
      className={`w-full bg-[#1f1f1f] border border-[#333] rounded-2xl p-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent transition-all shadow-lg ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => document.getElementById('tag-input-field')?.focus()}
    >
      {tags.map((tag, index) => (
        <div key={index} className="flex items-center gap-1 bg-[#2a2a2a] text-gray-200 px-3 py-1.5 rounded-lg text-sm group animate-fade-in border border-white/5">
          <span>{tag}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(index); }}
              className="text-gray-500 hover:text-red-400 focus:outline-none ml-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      ))}
      <input
        id="tag-input-field"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 bg-transparent text-white min-w-[150px] outline-none py-2 px-2"
        disabled={disabled}
      />
    </div>
  );
};

export default TagInput;