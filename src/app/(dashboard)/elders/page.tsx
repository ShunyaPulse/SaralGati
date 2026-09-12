'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlusCircle, Search, Users } from 'lucide-react';
import { ElderCard } from '@/components/elders/elder-card';
import { ElderForm } from '@/components/elders/elder-form';
import { useElderStore } from '@/stores/elder-store';
import { Modal } from '@/components/ui/modal';

export default function EldersPage() {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { elders, loading: isLoading, fetchElders, addElder } = useElderStore();

  useEffect(() => {
    fetchElders();
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [fetchElders, searchParams]);

  const filteredElders = elders.filter(elder => 
    elder.elder_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Elders</h1>
          <p className="text-slate-500 mt-1">Manage profiles and settings for your loved ones.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors w-full sm:w-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Add Elder
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
            placeholder="Search elders by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Elders Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white h-64 rounded-xl border border-slate-200"></div>
          ))}
        </div>
      ) : filteredElders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredElders.map(elder => (
            <ElderCard key={elder.id} elder={elder} />
          ))}
        </div>
      ) : (
        <div className="text-center bg-white rounded-xl border border-slate-200 py-16 px-6">
          <div className="mx-auto h-12 w-12 text-slate-400 flex items-center justify-center rounded-full bg-slate-100 mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-medium text-slate-900">No elders found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating a new elder profile.'}
          </p>
          {!searchQuery && (
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
              >
                <PlusCircle className="h-4 w-4" />
                Add Elder
              </button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Elder Profile">
        <ElderForm 
          onSubmit={async (data) => {
            await addElder(data);
            setIsModalOpen(false);
          }} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
}
