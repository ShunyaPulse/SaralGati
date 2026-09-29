import { fail, ok, type ServiceResult } from '@/server/http';
import { z } from 'zod';
import { rateLimiter, getSubnet } from '@/lib/data/redis';
import { cookies } from 'next/headers';
import { createMailer } from '@/lib/notify/mailer';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  website: z.string().optional(), // Honeypot field
});

/** POST /api/contact - the public contact form, delivered by email. */
export async function sendContactMessage(req: Request): Promise<ServiceResult> {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    const rateLimit = await rateLimiter(`contact:${ip}`, 3, 3600); // 3 requests per hour
    if (!rateLimit.allowed) {
      return fail(429, { error: 'Too many requests. Please try again later.' });
    }

    const subnetLimit = await rateLimiter(`contact_subnet:${subnet}`, 10, 3600);
    if (!subnetLimit.allowed) {
      return fail(429, { error: 'Too many requests from this network. Please try again later.' });
    }

    if (devId) {
      const devLimit = await rateLimiter(`contact_dev:${devId}`, 3, 3600);
      if (!devLimit.allowed) {
        return fail(429, { error: 'Too many requests from this device. Please try again later.' });
      }
    }

    const body = await req.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return fail(400, { error: result.error.issues[0].message });
    }

    const { name, email, subject, message, website } = result.data;

    // Honeypot check
    if (website) {
      return fail(400, { error: 'Invalid submission' });
    }

    // Recipient for submissions: dedicated inbox if configured, else the sender mailbox.
    const adminEmail = process.env.CONTACT_TO_EMAIL || process.env.SMTP_FROM;

    // One shared transport definition (see lib/mailer) so this route and the OTP
    // mail cannot drift apart, and so it inherits the bounded timeouts.
    const transporter = createMailer();

    // Fail loudly instead of reporting success for a message nobody will receive.
    if (!transporter || !adminEmail) {
      console.error('Contact form delivery is not configured (SMTP_USER / SMTP_PASS / CONTACT_TO_EMAIL).');
      return fail(503, { error: 'Message delivery is not configured. Please email us directly.' });
    }

    // Visitors control every one of these fields, so never interpolate them raw.
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@saralgati.com',
        to: adminEmail,
        replyTo: email,
        subject: `New Contact Form Submission: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
        html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
               <p><strong>Email:</strong> ${escapeHtml(email)}</p>
               <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
               <p><strong>Message:</strong></p>
               <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      });
    } catch (mailError) {
      console.error('Failed to deliver contact form email:', mailError);
      return fail(502, { error: 'Could not send your message. Please try again.' });
    }

    return ok({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    return fail(500, { error: 'Internal server error' });
  }
}
