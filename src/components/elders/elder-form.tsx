'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ElderProfile } from '@/types';
import { elderProfileSchema } from '@/lib/validations';
import { Smartphone } from 'lucide-react';

type ElderFormData = z.infer<typeof elderProfileSchema>;

interface ElderFormProps {
  initialData?: Partial<ElderProfile>;
  onSubmit: (data: ElderFormData) => Promise<void>;
  onCancel: () => void;
}

export function ElderForm({ initialData, onSubmit, onCancel }: ElderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ElderFormData, string>>>({});
  
  const [formData, setFormData] = useState<ElderFormData>({
    elder_name: initialData?.elder_name || '',
    phone_model: initialData?.phone_model || '',
    os_version: initialData?.os_version || '',
    emergency_contact: initialData?.emergency_contact || '',
    preferred_lang: initialData?.preferred_lang || 'hi',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ElderFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = elderProfileSchema.parse(formData);
      setIsSubmitting(true);
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof ElderFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof ElderFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Elder's Name"
        name="elder_name"
        value={formData.elder_name}
        onChange={handleChange}
        error={errors.elder_name}
        placeholder="e.g. Ramesh Kumar"
      />
      
      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 flex items-start gap-2.5">
        <Smartphone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-900">Automatic Device Detection</p>
          <p className="text-emerald-700 mt-0.5">
            Phone model & Android OS version will automatically be detected and updated as soon as the elder's smartphone pairs with this profile.
          </p>
          {formData.phone_model && (
            <p className="mt-1 font-medium text-emerald-900">
              Paired: {formData.phone_model} {formData.os_version ? `(${formData.os_version})` : ''}
            </p>
          )}
        </div>
      </div>

      <Input
        label="Emergency Contact"
        name="emergency_contact"
        value={formData.emergency_contact}
        onChange={handleChange}
        error={errors.emergency_contact}
        placeholder="+919876543210"
      />

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Preferred Language</label>
        <select
          name="preferred_lang"
          value={formData.preferred_lang}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="hi">Hindi</option>
          <option value="en">English</option>
          <option value="hinglish">Hinglish</option>
        </select>
        {errors.preferred_lang && <p className="text-sm text-red-500">{errors.preferred_lang}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
