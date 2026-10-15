import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, ClipboardList, RefreshCw, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const DEFAULT_ITEMS = [
  'Check economic calendar for high-impact news',
  'Review daily market bias and trend direction',
  'Define risk tolerance for the session',
  'Review previous trade performance',
  'Verify trading station setup and internet connectivity',
  'Set daily profit target and loss limit'
];

export const DailyChecklist: React.FC = () => {
  const [items, setItems] = useState<string[]>(() => {
    const stored = localStorage.getItem('trader_checklist_items');
    return stored ? JSON.parse(stored) : DEFAULT_ITEMS;
  });
  
  const [checkedItems, setCheckedItems] = useState<boolean[]>(() => {
    const stored = localStorage.getItem('trader_checklist_state');
    return stored ? JSON.parse(stored) : new Array(items.length).fill(false);
  });
  
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    localStorage.setItem('trader_checklist_items', JSON.stringify(items));
    localStorage.setItem('trader_checklist_state', JSON.stringify(checkedItems));
  }, [items, checkedItems]);

  const toggleItem = (index: number) => {
    const newChecked = [...checkedItems];
    newChecked[index] = !newChecked[index];
    setCheckedItems(newChecked);
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
      setCheckedItems([...checkedItems, false]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setCheckedItems(checkedItems.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const newChecked = [...checkedItems];
    const target = direction === 'up' ? index - 1 : index + 1;
    
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    [newChecked[index], newChecked[target]] = [newChecked[target], newChecked[index]];
    
    setItems(newItems);
    setCheckedItems(newChecked);
  };

  const resetChecklist = () => {
    setCheckedItems(new Array(items.length).fill(false));
  };

  const allChecked = checkedItems.every(Boolean) && checkedItems.length > 0;

  return (
    <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur shadow-2xl rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Daily Trader's Checklist</h3>
            <p className="text-xs text-gray-400">Customize & reorder your prep</p>
          </div>
        </div>
        <button
          onClick={resetChecklist}
          className="text-gray-500 hover:text-white transition-colors cursor-pointer"
          title="Reset checklist"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={addItem} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add new task..."
          className="flex-1 bg-zinc-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50"
        />
        <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
              checkedItems[index]
                ? 'bg-indigo-950/30 border-indigo-500/30'
                : 'bg-zinc-900/60 border-gray-800'
            }`}
          >
            <div onClick={() => toggleItem(index)} className="cursor-pointer flex items-center gap-3 flex-1">
              {checkedItems[index] ? (
                <CheckSquare className="w-5 h-5 text-indigo-400" />
              ) : (
                <Square className="w-5 h-5 text-gray-600" />
              )}
              <span className={`text-sm ${checkedItems[index] ? 'text-gray-300 line-through' : 'text-gray-200'}`}>
                {item}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => moveItem(index, 'up')} 
                disabled={index === 0}
                className="text-gray-500 hover:text-indigo-400 disabled:opacity-30 cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button 
                onClick={() => moveItem(index, 'down')} 
                disabled={index === items.length - 1}
                className="text-gray-500 hover:text-indigo-400 disabled:opacity-30 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button onClick={() => removeItem(index)} className="text-gray-600 hover:text-rose-400 cursor-pointer ml-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {allChecked && (
        <div className="mt-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
            <p className="text-sm font-bold text-emerald-400">Checklist complete. Ready to trade!</p>
        </div>
      )}
    </div>
  );
};

