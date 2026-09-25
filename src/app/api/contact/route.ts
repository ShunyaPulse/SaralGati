import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimiter, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';
import { createMailer } from '@/lib/mailer';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  website: z.string().optional(), // Honeypot field
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;
    
    const rateLimit = await rateLimiter(`contact:${ip}`, 3, 3600); // 3 requests per hour
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const subnetLimit = await rateLimiter(`contact_subnet:${subnet}`, 10, 3600);
    if (!subnetLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests from this network. Please try again later.' },
        { status: 429 }
      );
    }

    if (devId) {
      const devLimit = await rateLimiter(`contact_dev:${devId}`, 3, 3600);
      if (!devLimit.allowed) {
        return NextResponse.json(
          { error: 'Too many requests from this device. Please try again later.' },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, subject, message, website } = result.data;

    // Honeypot check
    if (website) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    // Recipient for submissions: dedicated inbox if configured, else the sender mailbox.
    const adminEmail = process.env.CONTACT_TO_EMAIL || process.env.SMTP_FROM;

    // One shared transport definition (see lib/mailer) so this route and the OTP
    // mail cannot drift apart, and so it inherits the bounded timeouts.
    const transporter = createMailer();

    // Fail loudly instead of reporting success for a message nobody will receive.
    if (!transporter || !adminEmail) {
      console.error('Contact form delivery is not configured (SMTP_USER / SMTP_PASS / CONTACT_TO_EMAIL).');
      return NextResponse.json(
        { error: 'Message delivery is not configured. Please email us directly.' },
        { status: 503 }
      );
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
      return NextResponse.json(
        { error: 'Could not send your message. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
