import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { ScriptQuote } from '../types';

// Helper function to remove SRT timecodes and counters
const stripSrtTimecodes = (srtText: string): string => {
    if (!srtText) return '';
  
    const lines = srtText.split(/\r?\n/);
    const textLines = lines.filter(line => {
      const isTimecode = line.includes('-->');
      const isCounter = /^\d+$/.test(line.trim());
      return !isTimecode && !isCounter && line.trim() !== '';
    });
  
    return textLines.join('\n');
};

export const generateDocx = async (
  fileName: string,
  transcript: string,
  translation: string,
  quotes: ScriptQuote[]
): Promise<void> => {
  const formatFileName = (name: string) => {
    const parts = name.split('.');
    parts.pop(); // Remove original extension
    return `${parts.join('.')}_processed.docx`;
  };

  const quotesBySpeaker = quotes.reduce((acc, q) => {
    (acc[q.speaker] = acc[q.speaker] || []).push(q);
    return acc;
  }, {} as Record<string, ScriptQuote[]>);
  
  const quoteSections = Object.entries(quotesBySpeaker).flatMap(([speaker, speakerQuotes]) => [
    new Paragraph({
        children: [
            new TextRun({
                text: speaker,
                bold: true,
                size: 24, // 12pt
            }),
        ],
        spacing: { before: 200 },
    }),
    ...speakerQuotes.map(q => new Paragraph({
        children: [new TextRun({ text: `"${q.quote}"`, italic: true })],
        indent: { left: 720 }, // 0.5 inch indent
        spacing: { after: 100 },
    }))
  ]);

  const cleanTranscript = stripSrtTimecodes(transcript);
  const cleanTranslation = stripSrtTimecodes(translation);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `Processed Audio: ${fileName}`,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: 'Original Transcription',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...cleanTranscript.split('\n').map(line => new Paragraph({
            children: [new TextRun({ text: line })]
          })),

          new Paragraph({
            text: 'Translation',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...cleanTranslation.split('\n').map(line => new Paragraph({
             children: [new TextRun({ text: line })]
          })),
          
          new Paragraph({
            text: 'Key Quotes',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...quoteSections,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = formatFileName(fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
