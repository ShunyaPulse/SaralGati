import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimiter, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

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
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, subject, message, website } = result.data;

    // Honeypot check
    if (website) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    const port = Number(process.env.SMTP_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const adminEmail = process.env.SMTP_FROM || 'techanics6174@gmail.com';
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@saralgati.com',
        to: adminEmail,
        replyTo: email,
        subject: `New Contact Form Submission: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
        html: `<p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Subject:</strong> ${subject}</p>
               <p><strong>Message:</strong></p>
               <p>${message.replace(/\n/g, '<br>')}</p>`,
      });
    } else {
      console.log('SMTP credentials not configured, skipping email delivery. Message was:', { name, email, subject, message });
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
