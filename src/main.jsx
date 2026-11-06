import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const screens = [
  ['demo-home4.jpg', 'Home'],
  ['WhatsApp Image 2026-10-31 at 2.11.51 PM.jpeg', 'Agent chat'],
  ['demo-market3.jpg', 'Marketplace'],
  ['WhatsApp Image 2026-10-31 at 2.11.50 PM.jpeg', 'Profile'],
];
const apkUrl = 'https://github.com/gratiostudios-ops/gratios/releases/download/v2/app-release.apk';
function App() {
  return <main className="mx-auto min-h-screen w-full max-w-6xl px-5 sm:px-8">
    <section className="flex flex-col items-center pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
      <img className="gratios-wordmark mb-3 h-auto w-[9.6rem] sm:mb-4 sm:w-48" src="/gratios-logo-white.png" alt="Gratios" />
      <p className="mb-2 text-xs font-medium tracking-[.14em] text-neutral-400">YOUR PERSONAL AGENT</p>
      <p className="mt-1 max-w-xl text-lg font-normal leading-relaxed text-neutral-300 sm:text-xl">Your personal agent, powered by agents from everywhere</p>
      <a className="download mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-blue-600 px-6 text-base font-semibold text-white transition active:scale-95" href={apkUrl} target="_blank" rel="noreferrer">Download for Android <span aria-hidden="true">↓</span></a>
      <p className="mt-7 text-sm font-semibold text-neutral-200">Available for Android</p>
      <p className="mt-1 text-sm font-normal text-neutral-500">Coming to iOS soon</p>
    </section>

    <section aria-label="Gratios app screens" className="pb-16 sm:pb-24">
      <div className="mb-8 text-left sm:mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-[.16em] text-neutral-400">Snapshots</h2>
      </div>
      <div className="screen-gallery -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-5 sm:overflow-visible sm:px-0">
        {screens.map(([file, label]) => <div key={file} className={`screen-frame w-[76vw] max-w-[320px] flex-none snap-center rounded-2xl sm:w-full sm:max-w-none sm:rounded-[20px]${label === 'Home' ? ' screen-frame-home' : ''}${label === 'Agent chat' || label === 'Profile' ? ' screen-frame-no-status' : ''}`}><img className="screen-shot" src={`/screens/${encodeURIComponent(file)}`} alt={label} loading="lazy" /></div>)}
      </div>
    </section>

    <footer className="border-t border-white/10 py-6 text-center text-sm text-neutral-400"><a className="transition hover:text-white" href="mailto:gratiostudios@gmail.com">Contact us · gratiostudios@gmail.com</a></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
