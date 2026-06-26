export type QuestionType =
  | "single_choice"
  | "number_input"
  | "multiple_choice"
  | "matching"
  | "file_selection";

export interface Option {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  order: number;
  title: string;
  question: string;
  note?: string;
  score: number;
  options?: Option[];
  select_count?: number;
  scoring?: string;
  left_items?: Option[];
  right_items?: Option[];
  input_type?: string;
  unit?: string;
  placeholder?: string;
}

export interface QuestionsData {
  challenge: {
    title: string;
    subtitle: string;
    description: string;
    company: string;
    event: string;
    event_date: string;
    total_score: number;
    time_limit_minutes: number;
    workspace_zip: string;
  };
  questions: Question[];
}

export type Answers = Record<string, string | string[] | Record<string, string>>;

export interface Participant {
  participantId: string;
  name: string;
  department: string;
  code: string;
}

export interface GradeRequest {
  participantId: string;
  name: string;
  department: string;
  code: string;
  answers: Answers;
}

export interface QuestionResult {
  questionId: string;
  title: string;
  score: number;
  maxScore: number;
  correct: boolean;
  feedback: string;
}

export interface GradeResponse {
  totalScore: number;
  maxScore: number;
  percentage: number;
  results: QuestionResult[];
  submittedAt: string;
}
