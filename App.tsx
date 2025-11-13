import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import FileProcessor from './components/FileProcessor';

const TimecodeToggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => {
    return (
      <label htmlFor="timecode-toggle" className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            id="timecode-toggle"
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className={`block w-14 h-8 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
              checked ? 'transform translate-x-6' : ''
          }`}></div>
        </div>
        <div className="ml-3 text-slate-700 font-medium">
          Add SRT Timecodes to Transcript
        </div>
      </label>
    );
};

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [addTimecodes, setAddTimecodes] = useState(true);

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newFiles = selectedFiles.filter(
      (sf) => !files.some(
        (ef) => ef.name === sf.name && ef.size === sf.size && ef.lastModified === sf.lastModified
      )
    );
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
            AudioScript AI
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
            Transcribe, translate, and summarize your audio files in a single workflow.
          </p>
        </header>
        
        <section className="mb-8 p-6 bg-white rounded-lg shadow-sm">
            <div className="flex justify-center mb-6">
                 <TimecodeToggle checked={addTimecodes} onChange={setAddTimecodes} />
            </div>
            <FileUploader onFilesSelected={handleFilesSelected} />
        </section>

        {files.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-3">Processing Queue</h2>
            <div className="space-y-6">
              {files.map((file, index) => (
                <FileProcessor 
                    key={`${file.name}-${file.lastModified}-${index}`} 
                    file={file} 
                    addTimecodes={addTimecodes}
                />
              ))}
            </div>
          </section>
        )}
      </main>
      <footer className="text-center py-6 text-sm text-slate-500">
          <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;