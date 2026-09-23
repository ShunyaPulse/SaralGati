'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

export function AlertFilters({ elders, filters, onFilterChange }: any) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isOpen, setIsOpen] = useState(false);

  const eventTypes = [
    'screen_confusion', 
    'wrong_tap', 
    'drop_off', 
    'stuck_loop',
    'emergency',
    'battery_low'
  ];

  const handleApply = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const emptyFilters = { elder_id: undefined, event_types: [], from_date: undefined, to_date: undefined };
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const toggleEventType = (type: string) => {
    const currentTypes = localFilters.event_types || [];
    if (currentTypes.includes(type)) {
      setLocalFilters({ ...localFilters, event_types: currentTypes.filter((t: string) => t !== type) });
    } else {
      setLocalFilters({ ...localFilters, event_types: [...currentTypes, type] });
    }
  };

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)} className="mb-4">
        <Filter className="w-4 h-4 mr-2" /> Filter Alerts
      </Button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
        <h3 className="font-medium text-gray-900 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-teal-600" /> Filter Options
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Elder</label>
          <select 
            value={localFilters.elder_id || ''} 
            onChange={(e) => setLocalFilters({ ...localFilters, elder_id: e.target.value })}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="">All Elders</option>
            {elders?.map((elder: any) => (
              <option key={elder.id} value={elder.id}>{elder.elder_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Event Types</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {eventTypes.map(type => (
              <label key={type} className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={(localFilters.event_types || []).includes(type)}
                  onChange={() => toggleEventType(type)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-600"
                />
                <span className="ml-2 text-sm text-gray-600">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="space-y-2">
            <input 
              type="date" 
              value={localFilters.from_date || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, from_date: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <input 
              type="date" 
              value={localFilters.to_date || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, to_date: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={handleReset}>Reset</Button>
        <Button onClick={handleApply} className="bg-teal-600 hover:bg-teal-700 text-white">Apply Filters</Button>
      </div>
    </div>
  );
}
