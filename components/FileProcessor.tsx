import React, { useState, useEffect, useCallback } from 'react';
import { TranscriptionStatus, Language, ScriptQuote } from '../types';
import { transcribeAudio, translateText, generateScript } from '../services/geminiService';
import { LANGUAGES, SpinnerIcon, CheckCircleIcon, XCircleIcon, ClipboardIcon, FileDownIcon } from '../constants';
import { generateDocx } from '../utils/docxGenerator';

interface FileProcessorProps {
  file: File;
  addTimecodes: boolean;
}

const StatusBadge: React.FC<{ status: TranscriptionStatus }> = ({ status }) => {
  const statusConfig = {
    [TranscriptionStatus.PENDING]: { text: 'Pending', color: 'bg-slate-200 text-slate-700' },
    [TranscriptionStatus.TRANSCRIBING]: { text: 'Transcribing...', color: 'bg-blue-200 text-blue-800' },
    [TranscriptionStatus.COMPLETED]: { text: 'Completed', color: 'bg-green-200 text-green-800' },
    [TranscriptionStatus.ERROR]: { text: 'Error', color: 'bg-red-200 text-red-800' },
    [TranscriptionStatus.TRANSLATED]: { text: 'Translated', color: 'bg-purple-200 text-purple-800' },
    [TranscriptionStatus.SUMMARIZED]: { text: 'Summarized', color: 'bg-yellow-200 text-yellow-800' },
  };
  const config = statusConfig[status] || statusConfig.PENDING;
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.text}</span>;
};

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


const FileProcessor: React.FC<FileProcessorProps> = ({ file, addTimecodes }) => {
  const [status, setStatus] = useState<TranscriptionStatus>(TranscriptionStatus.PENDING);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptQuote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language>(LANGUAGES[1]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const processTranscription = useCallback(async () => {
    setStatus(TranscriptionStatus.TRANSCRIBING);
    try {
      const result = await transcribeAudio(file, addTimecodes);
      setTranscript(result);
      setStatus(TranscriptionStatus.COMPLETED);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setStatus(TranscriptionStatus.ERROR);
    }
  }, [file, addTimecodes]);

  useEffect(() => {
    processTranscription();
  }, [processTranscription]);

  const handleTranslate = async () => {
    if (!transcript) return;
    setIsTranslating(true);
    setError(null);
    try {
      const result = await translateText(transcript, targetLanguage.name);
      setTranslation(result);
      setStatus(TranscriptionStatus.TRANSLATED);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!translation) return;
    setIsGenerating(true);
    setError(null);
    try {
      // Strip timecodes if they exist for better script generation
      const textForScript = addTimecodes && translation ? stripSrtTimecodes(translation) : translation;
      const result = await generateScript(textForScript || "");
      setScript(result);
      setStatus(TranscriptionStatus.SUMMARIZED);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Script generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if(!script) return;
    const scriptText = script.map(s => `${s.speaker}: "${s.quote}"`).join('\n\n');
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    if (!transcript || !translation || !script) return;
    await generateDocx(
      file.name, 
      transcript, 
      translation, 
      script
    );
  };

  const handleDownloadSrt = (content: string, type: 'transcript' | 'translation') => {
    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    a.download = `${baseName}_${type}.srt`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const quotesBySpeaker: Record<string, ScriptQuote[]> = script
    ? script.reduce((acc, q) => {
        (acc[q.speaker] = acc[q.speaker] || []).push(q);
        return acc;
      }, {} as Record<string, ScriptQuote[]>)
    : {};


  const renderContent = () => {
    if (status === TranscriptionStatus.TRANSCRIBING) {
      return (
        <div className="flex items-center justify-center p-8 text-slate-500">
          <SpinnerIcon className="w-6 h-6 mr-2" />
          <span>Transcribing audio...</span>
        </div>
      );
    }

    if (status === TranscriptionStatus.ERROR && !transcript) {
      return (
        <div className="p-4 text-red-700 bg-red-100 rounded-md">
          <p className="font-semibold">Transcription Failed</p>
          <p>{error}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {transcript && (
          <section>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Transcript</h3>
            <div className="p-4 bg-slate-100 rounded-md max-h-48 overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap font-mono">
              {transcript}
            </div>
          </section>
        )}
        
        {status >= TranscriptionStatus.COMPLETED && transcript && (
          <section className="p-4 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Translate</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <select
                value={targetLanguage.code}
                onChange={(e) => setTargetLanguage(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[0])}
                className="block w-full sm:w-auto px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
              </select>
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
              >
                {isTranslating ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null}
                {isTranslating ? 'Translating...' : 'Translate'}
              </button>
            </div>
          </section>
        )}

        {isTranslating && <div className="flex items-center text-slate-500"><SpinnerIcon className="w-5 h-5 mr-2" /><span>Translating...</span></div>}
        
        {translation && (
           <section>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Translation ({targetLanguage.name})</h3>
            <div className="p-4 bg-slate-100 rounded-md max-h-48 overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap font-mono">
              {translation}
            </div>
          </section>
        )}
        
        {translation && addTimecodes && (
            <section className="p-4 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Download SRT Files</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => handleDownloadSrt(transcript!, 'transcript')}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        <FileDownIcon className="w-4 h-4 mr-2" />
                        Download Transcript (.srt)
                    </button>
                    <button
                        onClick={() => handleDownloadSrt(translation, 'translation')}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        <FileDownIcon className="w-4 h-4 mr-2" />
                        Download Translation (.srt)
                    </button>
                </div>
            </section>
        )}

        {status >= TranscriptionStatus.TRANSLATED && translation && (
           <section className="p-4 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Generate Script</h3>
            <button
                onClick={handleGenerateScript}
                disabled={isGenerating}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
              >
                {isGenerating ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null}
                {isGenerating ? 'Generating...' : 'Generate Script from Translation'}
              </button>
           </section>
        )}

        {isGenerating && <div className="flex items-center text-slate-500"><SpinnerIcon className="w-5 h-5 mr-2" /><span>Generating script...</span></div>}

        {error && status > TranscriptionStatus.COMPLETED && (
            <div className="p-4 my-4 text-red-700 bg-red-100 rounded-md">
                <p>{error}</p>
            </div>
        )}

        {script && (
            <section>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-slate-800">Generated Script Quotes</h3>
                <div className='flex items-center gap-2'>
                  <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center px-3 py-1 text-sm text-slate-600 bg-slate-200 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                  >
                      {copied ? <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600" /> : <ClipboardIcon className="w-4 h-4 mr-2" />}
                      {copied ? 'Copied!' : 'Copy'}
                  </button>
                   <button
                        onClick={handleDownloadDocx}
                        className="flex items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <FileDownIcon className="w-4 h-4 mr-2" />
                        Download .docx
                    </button>
                </div>
              </div>
              <div className="space-y-4 pt-2">
                 {Object.entries(quotesBySpeaker).map(([speaker, quotes]) => (
                    <div key={speaker}>
                        <h4 className="font-semibold text-slate-700 mb-2">{speaker}</h4>
                        <div className="space-y-3">
                            {(quotes as ScriptQuote[]).map((item, index) => (
                                <blockquote key={index} className="p-4 border-l-4 border-indigo-500 bg-indigo-50">
                                    <p className="text-md italic font-medium text-indigo-800">"{item.quote}"</p>
                                </blockquote>
                            ))}
                        </div>
                    </div>
                ))}
              </div>
            </section>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl">
      <header className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
        <p className="font-semibold text-slate-800 truncate pr-4" title={file.name}>{file.name}</p>
        <StatusBadge status={status} />
      </header>
      <div className="p-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default FileProcessor;