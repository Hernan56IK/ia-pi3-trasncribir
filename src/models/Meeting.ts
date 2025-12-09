/**
 * Modelos de datos para reuniones y resúmenes
 */

export interface Participant {
  userId: string;
  userName: string;
  userEmail?: string;
  joinedAt: string;
  leftAt?: string;
}

export interface ChatMessage {
  message: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface AudioTranscription {
  text: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface Task {
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface MeetingData {
  meetingId: string;
  title?: string;
  startTime: string;
  endTime?: string;
  participants: Map<string, Participant>;
  chatMessages: ChatMessage[];
  audioTranscriptions: AudioTranscription[];
  isActive: boolean;
}

export interface MeetingSummary {
  meetingId: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number; // en minutos
  participants: Participant[];
  summary: string;
  tasks: Task[];
  chatHighlights: string[];
  createdAt: string;
}



