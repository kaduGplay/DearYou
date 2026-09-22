export type PageData = {
  slug: string; kind: string; style: string; title: string; recipient: string; startDate: string; message: string; theme: string; musicUrl: string; plan: string | null;
  quizPrize: string; quizNeeded: number; senderName?: string;
  quiz: { id: string; text: string; correct: string; wrong: string[] }[];
  photos: { id: string; url: string; caption: string }[];
  timeline: { id: string; date: string; title: string; text: string; photo?: string | null }[];
  guestbook: { id: string; author: string; message: string; createdAt: string }[];
};
