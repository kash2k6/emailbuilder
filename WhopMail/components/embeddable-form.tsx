"use client"

import React, { useState, useEffect } from 'react'
import { type EmbeddableForm, type FormField } from '@/app/actions/embeddable-forms'

interface EmbeddableFormProps {
  formId: string
  form?: EmbeddableForm
}

export function EmbeddableForm({ formId, form: initialForm }: EmbeddableFormProps) {
  const [form, setForm] = useState<EmbeddableForm | null>(initialForm || null)
  const [isLoading, setIsLoading] = useState(!initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})

  // Load form data if not provided
  useEffect(() => {
    if (!initialForm && formId) {
      const loadForm = async () => {
        try {
          const response = await fetch(`/api/forms/${formId}`)
          const result = await response.json()
          
          if (result.success && result.form) {
            setForm(result.form)
          } else {
            setError('Form not found')
          }
        } catch (error) {
          console.error('Error loading form:', error)
          setError('Failed to load form')
        } finally {
          setIsLoading(false)
        }
      }
      loadForm()
    }
  }, [formId, initialForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Validate required fields
      const requiredFields = form.fields.filter(field => field.required)
      const missingFields = requiredFields.filter(field => !formData[field.id])
      
      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`)
        return
      }

      // Extract email and name fields
      const emailField = form.fields.find(f => f.type === 'email')
      const firstNameField = form.fields.find(f => f.id === 'first_name' || f.label.toLowerCase().includes('first'))
      const lastNameField = form.fields.find(f => f.id === 'last_name' || f.label.toLowerCase().includes('last'))
      const fullNameField = form.fields.find(f => f.id === 'full_name' || f.label.toLowerCase().includes('full name'))

      const email = emailField ? formData[emailField.id] : ''
      const firstName = firstNameField ? formData[firstNameField.id] : ''
      const lastName = lastNameField ? formData[lastNameField.id] : ''
      const fullName = fullNameField ? formData[fullNameField.id] : ''

      if (!email) {
        setError('Email address is required')
        return
      }

      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          form_data: formData
        })
      })

      const result = await response.json()

      if (result.success) {
        setIsSubmitted(true)
        
        // Redirect if specified
        if (form.redirect_url) {
          setTimeout(() => {
            window.location.href = form.redirect_url!
          }, 2000)
        }
      } else {
        setError(result.error || 'Failed to submit form')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setError('Failed to submit form')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const renderField = (field: FormField) => {
    const value = formData[field.id] || ''
    const isRequired = field.required

    switch (field.type) {
      case 'email':
        return (
          <div key={field.id} style={{ marginBottom: '16px' }}>
            <label htmlFor={field.id} style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              {field.label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <input
              id={field.id}
              type="email"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={isRequired}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                color: form.text_color
              }}
            />
          </div>
        )

      case 'text':
        return (
          <div key={field.id} style={{ marginBottom: '16px' }}>
            <label htmlFor={field.id} style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              {field.label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <input
              id={field.id}
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={isRequired}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                color: form.text_color
              }}
            />
          </div>
        )

      case 'textarea':
        return (
          <div key={field.id} style={{ marginBottom: '16px' }}>
            <label htmlFor={field.id} style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              {field.label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <textarea
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={isRequired}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                color: form.text_color,
                resize: 'vertical'
              }}
            />
          </div>
        )

      case 'select':
        return (
          <div key={field.id} style={{ marginBottom: '16px' }}>
            <label htmlFor={field.id} style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              {field.label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <select
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                color: form.text_color
              }}
            >
              <option value="">{field.placeholder || 'Select an option'}</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id={field.id}
              checked={value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              required={isRequired}
              style={{
                width: '16px',
                height: '16px',
                margin: 0
              }}
            />
            <label htmlFor={field.id} style={{ fontSize: '14px', fontWeight: '500' }}>
              {field.label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
          </div>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid #f3f4f6', 
            borderTop: '3px solid #f97316', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Loading form...</p>
        </div>
      </div>
    )
  }

  if (error && !form) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '6px',
          color: '#dc2626'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#f0f9ff', 
          border: '1px solid #bae6fd', 
          borderRadius: '6px',
          color: '#0369a1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span>
            <span>Form not found or inactive</span>
          </div>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div 
        style={{ 
          padding: '24px',
          backgroundColor: form.background_color,
          color: form.text_color,
          borderColor: form.button_color,
          borderRadius: '8px',
          border: `1px solid ${form.button_color}`,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            backgroundColor: '#10b981', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'white',
            fontSize: '24px'
          }}>
            ✓
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{form.success_message}</h3>
          {form.redirect_url && (
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Redirecting you shortly...
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className="p-6 rounded-lg border shadow-sm"
      style={{ 
        backgroundColor: form.background_color,
        color: form.text_color,
        borderColor: form.button_color,
        borderRadius: '8px',
        border: `1px solid ${form.button_color}`,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo */}
        {form.logo_url && (
          <div className="text-center mb-4">
            <img 
              src={form.logo_url} 
              alt="Logo" 
              className="h-12 mx-auto object-contain"
            />
          </div>
        )}

        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">{form.title}</h2>
          {form.subtitle && (
            <p className="text-sm opacity-80">{form.subtitle}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '6px',
            color: '#dc2626',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div style={{ marginBottom: '16px' }}>
          {form.fields.map(renderField)}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ 
            width: '100%',
            backgroundColor: form.button_color,
            borderColor: form.button_color,
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
            transition: 'opacity 0.2s ease'
          }}
        >
          {isSubmitting ? (
            <>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #ffffff', 
                borderTop: '2px solid transparent', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                marginRight: '8px',
                display: 'inline-block'
              }} />
              Submitting...
            </>
          ) : (
            form.button_text
          )}
        </button>

        {/* Powered by branding */}
        {form.show_powered_by && (
          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>
              Powered by{' '}
              <a 
                href="https://www.whopmail.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#f97316', textDecoration: 'none' }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                WhopMail
              </a>
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
