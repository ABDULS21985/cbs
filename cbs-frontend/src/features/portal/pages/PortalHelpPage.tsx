import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HelpCircle, Phone, Mail, Clock, ChevronDown, ChevronUp, Send, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { portalApi } from '../api/portalApi';

export function PortalHelpPage() {
  useEffect(() => { document.title = 'Help & Support | BellBank'; }, []);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });

  const { data: faqs = [] } = useQuery({ queryKey: ['portal', 'help', 'faq'], queryFn: () => portalApi.getFaq() });
  const contactMut = useMutation({
    mutationFn: () => portalApi.submitContactForm(contactForm),
    onSuccess: () => { toast.success('Message sent! We\'ll respond within 24 hours.'); setContactForm({ name: '', email: '', subject: '', message: '' }); },
    onError: () => toast.error('Failed to send message'),
  });

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Help & Support</h1>

      {/* Contact info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Phone className="w-4 h-4 text-blue-600" /></div>
          <div><p className="text-sm font-medium">Call Us</p><p className="text-xs text-muted-foreground">+234-1-234-5678</p></div></div>
        <div className="rounded-lg border p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><Mail className="w-4 h-4 text-green-600" /></div>
          <div><p className="text-sm font-medium">Email</p><p className="text-xs text-muted-foreground">support@bellbank.ng</p></div></div>
        <div className="rounded-lg border p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Clock className="w-4 h-4 text-amber-600" /></div>
          <div><p className="text-sm font-medium">Hours</p><p className="text-xs text-muted-foreground">Mon-Fri 8am-6pm</p></div></div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {(faqs as { q: string; a: string }[]).map((faq, i) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-muted/50" aria-expanded={openFaq === i}>
                <span>{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              </button>
              {openFaq === i && <div className="px-4 pb-3 text-sm text-muted-foreground">{faq.a}</div>}
            </div>
          ))}
          {faqs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Loading FAQ...</p>}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link to="/portal/requests" className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"><AlertTriangle className="w-4 h-4" /> Report an Issue</Link>
        <a href="https://www.google.com/maps/search/BellBank+branch" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
          <MapPin className="w-4 h-4" /> Find Branch
        </a>
      </div>

      {/* Contact form */}
      <div className="rounded-lg border p-6">
        <h2 className="text-sm font-semibold mb-4">Contact Us</h2>
        <div className="space-y-3 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <input value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className={fc} />
            <input value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" type="email" className={fc} />
          </div>
          <input value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" className={fc} />
          <textarea value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} placeholder="How can we help?" rows={4} className={fc} />
          <button onClick={() => contactMut.mutate()} disabled={!contactForm.name || !contactForm.message || contactMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {contactMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
