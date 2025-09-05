import { getForm } from '@/app/actions/embeddable-forms'
import { EmbeddableForm } from '@/components/embeddable-form'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

interface EmbedFormPageProps {
  params: {
    formId: string
  }
}

export async function generateMetadata({ params }: EmbedFormPageProps): Promise<Metadata> {
  const form = await getForm(params.formId)
  
  return {
    title: form?.title || 'Signup Form',
    description: form?.subtitle || 'Join our mailing list',
    robots: 'noindex, nofollow', // Prevent search engines from indexing embed pages
  }
}

export default async function EmbedFormPage({ params }: EmbedFormPageProps) {
  const { formId } = params

  // Get the form data
  const form = await getForm(formId)

  if (!form || !form.is_active) {
    notFound()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <EmbeddableForm formId={formId} form={form} />
      </div>
    </div>
  )
}
