export interface Declaration {
  id: number;
  userId: number | string;
  perioada: { start: string; end: string };
  activitati: any[]; 
  status: string;
  dataCreare: string;
  pdfBase64?: string; // PDF salvat ca base64

}
