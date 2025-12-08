import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { MeetingSummary } from '../models/Meeting';

dotenv.config();

/**
 * Servicio para enviar emails con resúmenes
 */
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Envía el resumen de la reunión por email
   */
  async sendSummaryEmail(
    summary: MeetingSummary,
    participantEmails: string[]
  ): Promise<void> {
    if (participantEmails.length === 0) {
      console.warn('⚠️ No hay emails de participantes para enviar');
      return;
    }

    const htmlContent = this.generateEmailHTML(summary);
    const textContent = this.generateEmailText(summary);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: participantEmails.join(', '),
      subject: `Resumen de Reunión: ${summary.title}`,
      text: textContent,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado:', info.messageId);
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Genera el HTML del email
   */
  private generateEmailHTML(summary: MeetingSummary): string {
    const tasksHTML =
      summary.tasks.length > 0
        ? `
        <h2>Tareas y Compromisos</h2>
        <ul style="list-style-type: none; padding: 0;">
          ${summary.tasks
            .map(
              (task) => `
            <li style="background: #fff; margin: 10px 0; padding: 10px; border-left: 3px solid #3498db;">
              <strong>${task.description}</strong>
              ${task.assignedToName ? `<br>Asignado a: ${task.assignedToName}` : ''}
              ${task.priority ? `<br>Prioridad: ${task.priority}` : ''}
            </li>
          `
            )
            .join('')}
        </ul>
      `
        : '<p>No se identificaron tareas específicas en esta reunión.</p>';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #2c3e50; }
            h2 { color: #34495e; margin-top: 20px; }
            .info { background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Resumen de Reunión</h1>
            <div class="info">
              <p><strong>Título:</strong> ${summary.title}</p>
              <p><strong>Fecha:</strong> ${new Date(summary.startTime).toLocaleString('es-ES')}</p>
              <p><strong>Duración:</strong> ${summary.duration} minutos</p>
            </div>

            <h2>Participantes</h2>
            <ul>
              ${summary.participants.map((p) => `<li>${p.userName}</li>`).join('')}
            </ul>

            <h2>Resumen</h2>
            <div style="white-space: pre-wrap;">${summary.summary}</div>

            ${tasksHTML}

            <hr>
            <p style="color: #7f8c8d; font-size: 12px;">
              Este resumen fue generado automáticamente por nuestro sistema de IA.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Genera el texto plano del email
   */
  private generateEmailText(summary: MeetingSummary): string {
    return `
Resumen de Reunión: ${summary.title}
Fecha: ${new Date(summary.startTime).toLocaleString('es-ES')}
Duración: ${summary.duration} minutos

Participantes:
${summary.participants.map((p) => `- ${p.userName}`).join('\n')}

Resumen:
${summary.summary}

Tareas y Compromisos:
${
      summary.tasks.length > 0
        ? summary.tasks
            .map(
              (t) =>
                `- ${t.description}${t.assignedToName ? ` (Asignado a: ${t.assignedToName})` : ''}`
            )
            .join('\n')
        : 'No se identificaron tareas específicas.'
    }
    `.trim();
  }
}

