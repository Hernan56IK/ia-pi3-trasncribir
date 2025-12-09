import { MeetingSummary } from '../models/Meeting';
import { getFirestoreInstance } from '../config/firebase';
import dotenv from 'dotenv';

dotenv.config();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Servicio para enviar emails con resúmenes usando Brevo API REST HTTP directo
 * (Igual que el proyecto Python que funciona)
 */
export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('BREVO_API_KEY no está configurada en las variables de entorno');
    }

    // Usar sender autorizado en Brevo (hardcodeado igual que el proyecto Python)
    this.fromEmail = 'sado56hdgm@gmail.com'; // Sender autorizado en Brevo
    this.fromName = 'Sistema de Resúmenes de Reuniones';
  }

  /**
   * Envía el resumen de la reunión por email usando Brevo API HTTP directo
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

    const headers = {
      'accept': 'application/json',
      'api-key': this.apiKey,
      'content-type': 'application/json',
    };

    // Payload igual que el proyecto Python que funciona
    const payload: any = {
      sender: {
        name: this.fromName,
        email: this.fromEmail,
      },
      to: participantEmails.map((email) => ({
        email: email,
        name: email.split('@')[0], // Usar parte antes del @ como nombre
      })),
      subject: `Resumen de Reunión: ${summary.title}`,
      htmlContent: htmlContent,
    };

    if (textContent) {
      payload.textContent = textContent;
    }

    try {
      console.log('[BREVO_DEBUG] Enviando request a Brevo API...');
      console.log(`[BREVO_DEBUG] URL: ${BREVO_API_URL}`);
      console.log(`[BREVO_DEBUG] Headers:`, JSON.stringify(headers, null, 2));
      console.log(`[BREVO_DEBUG] Payload:`, JSON.stringify(payload, null, 2));
      console.log(`[BREVO_DEBUG] From: ${this.fromEmail} (${this.fromName})`);
      console.log(`[BREVO_DEBUG] To: ${participantEmails.join(', ')}`);

      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      console.log(`[BREVO_DEBUG] Status Code: ${response.status}`);
      console.log(`[BREVO_DEBUG] Response Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      const responseText = await response.text();
      console.log(`[BREVO_DEBUG] Response: ${responseText}`);

      if (response.status !== 201) {
        let errorMessage = `Brevo API error: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
          console.error(`[BREVO_ERROR] Error en Brevo API - Status: ${response.status}`);
          console.error(`[BREVO_ERROR] Response: ${responseText}`);
        } catch (e) {
          // Si no se puede parsear, usar el texto directo
          errorMessage = responseText || errorMessage;
        }

        // Mostrar mensaje de error más claro
        if (response.status === 403) {
          console.error('⚠️ Error 403 - Cuenta de Brevo:', errorMessage);
          console.error('💡 Verifica que tu cuenta de Brevo esté activada y tenga permisos para enviar emails');
        } else if (response.status === 401) {
          console.error('⚠️ Error 401 - API Key inválida. Verifica BREVO_API_KEY en las variables de entorno');
        } else if (response.status === 400) {
          console.error('⚠️ Error 400 - Solicitud inválida:', errorMessage);
        }

        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log(`✅ Email enviado exitosamente usando Brevo API. Message ID: ${result.messageId || 'N/A'}`);
      console.log(`📧 Enviado a ${participantEmails.length} participantes: ${participantEmails.join(', ')}`);

      // También guardar el resumen en Firestore para referencia (opcional)
      try {
        const db = getFirestoreInstance();
        if (db) {
          await db.collection('meeting_summaries').doc(summary.meetingId).set({
            ...summary,
            participantEmails,
            sentAt: new Date().toISOString(),
            emailProvider: 'brevo-api',
            brevoMessageId: result.messageId || null,
          });
          console.log(`✅ Resumen guardado en Firestore: ${summary.meetingId}`);
        }
      } catch (firestoreError) {
        // No fallar si Firestore no está disponible, solo loguear
        console.warn('⚠️ No se pudo guardar en Firestore (opcional):', firestoreError);
      }
    } catch (error: any) {
      console.error('❌ Error enviando email con Brevo API:', error);
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



