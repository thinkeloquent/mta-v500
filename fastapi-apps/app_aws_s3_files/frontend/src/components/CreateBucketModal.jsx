import React, { useState } from 'react';
import { Modal } from './Modal.jsx';

export const CreateBucketModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    region: 'us-east-1',
    accessControl: 'private'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const regions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Bucket name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Bucket name must be at least 3 characters';
    } else if (formData.name.length > 63) {
      newErrors.name = 'Bucket name must be less than 63 characters';
    } else if (!/^[a-z0-9.-]+$/.test(formData.name)) {
      newErrors.name = 'Bucket name can only contain lowercase letters, numbers, dots, and hyphens';
    } else if (formData.name.startsWith('.') || formData.name.endsWith('.')) {
      newErrors.name = 'Bucket name cannot start or end with a dot';
    } else if (formData.name.includes('..')) {
      newErrors.name = 'Bucket name cannot contain consecutive dots';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onCreate(formData);
      handleClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', region: 'us-east-1', accessControl: 'private' });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Bucket" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bucket Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="my-bucket-name"
            className={`input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must be globally unique and follow AWS naming conventions
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Region
          </label>
          <select
            value={formData.region}
            onChange={(e) => handleInputChange('region', e.target.value)}
            className="input"
            disabled={isSubmitting}
          >
            {regions.map(region => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Control
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="accessControl"
                value="private"
                checked={formData.accessControl === 'private'}
                onChange={(e) => handleInputChange('accessControl', e.target.value)}
                className="text-primary-600 focus:ring-primary-500"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Private (Recommended)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="accessControl"
                value="public-read"
                checked={formData.accessControl === 'public-read'}
                onChange={(e) => handleInputChange('accessControl', e.target.value)}
                className="text-primary-600 focus:ring-primary-500"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Public Read</span>
            </label>
          </div>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Bucket'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
