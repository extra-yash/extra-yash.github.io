/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { brandStrategyContent, operationsContent, visualContent, scrapbookContent } from './content';
const ExtraLogoDark = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180.83 297.34" className={className} aria-label="Extra">
    <path fill="#ff2c00" d="M948.24,266.9l-47.14-39.71c42.56-50.54,66.01-78.37,73.77-99.95,6.67-18.55,3.55-38.59-4.81-86.13l60.71-10.67c9.09,51.73,14.58,82.96,2.1,117.65-11.5,31.98-35.94,60.99-84.62,118.8Z"/>
    <rect fill="#ff2c00" x="1033.87" y="118.58" width="61.64" height="145.44" transform="translate(125.63 728.26) rotate(-39.95)"/>
    <rect fill="#ff2c00" x="891.63" y="105.14" width="248.39" height="61.64" transform="translate(-7.99 89.07) rotate(-5)"/>
    <path fill="#1a1a2e" d="M204.11,258.08l55-77.51-62.23-87.19h65.23l35.02,49.22,35.55-50.41h69.91l-56.89,79.78,61.2,86.11h-69.91l-33.66-48.14-34,48.14h-65.23Z"/>
    <path fill="#1a1a2e" d="M139.16,261.47c-18.22,1.85-34.75-.27-49.14-6.3-14.47-6.06-26.27-15.41-35.06-27.8-8.75-12.34-14.05-27.05-15.74-43.73-1.78-17.53.23-33.47,5.95-47.37,5.76-13.98,14.68-25.44,26.5-34.07,11.8-8.61,26.14-13.82,42.6-15.49,17.09-1.73,32.51.21,45.83,5.78,13.4,5.61,24.38,14.29,32.63,25.82,8.23,11.51,13.24,25.68,14.91,42.11.31,3.01.49,6.57.54,10.57.05,4.07-.1,7.92-.45,11.45l-.33,3.37-116.29,11.78c1.64,4.75,4.1,8.75,7.34,11.94,4.26,4.22,9.55,7.18,15.72,8.79,6.39,1.68,13.37,2.15,20.75,1.4,8.97-.91,17.57-3.31,25.58-7.13,8.04-3.84,15.31-8.85,21.62-14.9l3.53-3.39,21.12,31.15-2.33,2.41c-9.78,10.16-20.38,18.09-31.51,23.58-11.15,5.5-22.52,8.87-33.79,10.02ZM155.4,154.03c-1.49-7.57-4.9-13.5-10.37-18.04-6.39-5.3-14.58-7.37-25.04-6.31-9.44.96-17.12,4.7-23.48,11.45-5.27,5.6-8.06,12.09-8.47,19.72l67.35-6.82Z"/>
    <path fill="#1a1a2e" d="M499.1,156.45l41.49-4.23v-61.1h-41.49V30.44h-58.42v60.68h-31.56v74.37l31.56-3.15v41.38c0,14.9,1.98,26.22,5.93,34.07,3.95,7.8,10.57,13.03,19.81,15.75,9.24,2.67,21.63,4.01,37.27,4.01h36.9v-47.63h-16.87c-9.51,0-15.97-1.39-19.44-4.06-3.47-2.67-5.18-8.54-5.18-17.52v-31.89Z"/>
    <path fill="#1a1a2e" d="M567.08,258.08V91.08h48.51l10.91,53.36s5.45-37.3,25.47-50.53c10.49-6.93,23.85-9.3,39.21-8.49v87.15c-3.23-.54-6.06-.87-8.49-1.01-2.43-.13-5.13-.2-8.09-.2-14.82,0-26.21,3.51-34.16,10.51-7.95,7.01-11.92,18.46-11.92,34.36v41.86h-61.44Z"/>
    <path fill="#1a1a2e" d="M764.01,262.12c-8.05,0-15.79-1.12-23.02-3.33-7.53-2.3-14.18-5.85-19.74-10.52-5.6-4.71-10.14-10.59-13.49-17.47-3.39-6.97-5.11-15-5.11-23.85,0-10.55,2.92-19.97,8.66-28.01,5.39-7.53,12.51-13.87,21.17-18.83,8.32-4.77,17.92-8.38,28.55-10.74,10.38-2.3,21.1-3.46,31.85-3.46,5.74,0,10.75.11,14.91.33.74.04,1.49.08,2.25.13,0,0,1.35-8.75-4.32-13.07-4.05-3.08-9.81-4.21-18.7-4.3-8.04-.07-16.37,1.15-24.77,3.42-8.4,2.27-16.48,5.62-24.01,9.97l-8.17,4.72-21.64-41.73,7.48-4.31c10.3-5.94,21.51-10.68,33.32-14.09,11.92-3.44,24.63-5.19,37.79-5.19,8.68,0,17.34.98,25.74,2.93,8.8,2.04,16.85,5.46,23.9,10.16,7.35,4.9,13.3,11.36,17.7,19.19,4.44,7.94,6.7,23.01,6.7,34.25v110.15h-50.55v-9.38c-3.15,2.08-6.56,3.93-10.25,5.56-11.21,4.96-23.4,7.47-36.24,7.47ZM792.87,192.18c-14.55,0-25.4,1.79-32.27,5.32-4.91,2.52-7.4,5.08-7.4,7.61,0,2.83,0,9.46,19.21,9.46,5.58,0,10.84-.7,15.66-2.09,4.74-1.37,8.93-3.26,12.48-5.63,3.26-2.17,5.71-4.68,7.52-7.67,1.22-2.03,1.98-4.18,2.28-6.52-1.95-.18-3.82-.28-5.63-.33-4.46-.1-8.41-.16-11.84-.16Z"/>
  </svg>
);

// --- Types ---

export type PageId = 'strategy' | 'operations' | 'visual' | 'scrapbook';

interface PageConfig {
  title: string;
  docLabel: string;
  navLabel: string;
  href: string;
  showInNav: boolean;
  content: string;
}

const PAGES: Record<PageId, PageConfig> = {
  strategy: {
    title: 'Extra Brand Strategy',
    docLabel: 'DOC 01',
    navLabel: 'Brand Strategy',
    href: '/brand/strategy/',
    showInNav: true,
    content: brandStrategyContent,
  },
  visual: {
    title: 'Extra Visual Guidelines',
    docLabel: 'DOC 03',
    navLabel: 'Visual Guidelines',
    href: '/brand/visual/',
    showInNav: true,
    content: visualContent,
  },
  operations: {
    title: 'Extra Operational Handbook',
    docLabel: 'DOC 02',
    navLabel: 'Operational Handbook',
    href: '/brand/operations/',
    showInNav: true,
    content: operationsContent,
  },
  scrapbook: {
    title: 'Extra Scrapbook',
    docLabel: 'ARCHIVE',
    navLabel: 'Scrapbook',
    href: '/brand/scrapbook/',
    showInNav: false,
    content: scrapbookContent,
  },
};

// --- Components ---

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      setIsPointer(window.getComputedStyle(target).cursor === 'pointer' || target.tagName.toLowerCase() === 'button' || target.tagName.toLowerCase() === 'a');
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 w-3 h-3 pointer-events-none z-[9999] mix-blend-difference hidden md:block"
      animate={{
        x: position.x - 6,
        y: position.y - 6,
        scale: isPointer ? 3 : 1,
      }}
      transition={{ type: "tween", ease: "linear", duration: 0.1 }}
    >
      <div className="w-full h-full bg-extra-light rounded-full" />
    </motion.div>
  );
};

const MarketGrid = () => (
  <div className="w-full xl:w-[110%] xl:-ml-[5%] border-2 border-extra-dark p-8 my-20 bg-extra-light relative font-mono text-xs shadow-[8px_8px_0_0_#1A1A2E]">
    <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none"></div>
    <div className="relative z-10 flex flex-col items-center h-[500px] justify-between">

      {/* Top Label */}
      <div className="uppercase font-bold tracking-widest text-extra-dark bg-extra-light px-4 py-1 border border-extra-dark z-20 shadow-sm">Deep Specialist</div>

      {/* Center Axes */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-full h-[2px] bg-[#1A1A2E4D] border-dashed"></div>
        <div className="absolute h-full w-[2px] bg-[#1A1A2E4D] border-dashed"></div>
      </div>

      {/* Axis Labels */}
      <div className="absolute inset-0 pointer-events-none z-10 flex">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 origin-left -rotate-90">
             <div className="uppercase font-bold tracking-widest bg-extra-light px-2 whitespace-nowrap text-extra-dark">Freelancer Rates</div>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 origin-right rotate-90">
             <div className="uppercase font-bold tracking-widest bg-extra-light px-2 whitespace-nowrap text-extra-dark">Agency Premiums</div>
        </div>
      </div>

      {/* Competitors */}
      <div className="absolute top-[15%] left-[25%] -translate-x-1/2 -translate-y-1/2 text-center bg-[#FFFFF0E6] p-2 border border-extra-dark max-w-[140px] shadow-sm">
         <div className="font-bold underline text-[10px]">Independent Masters</div>
         <div className="opacity-60 italic text-[10px]">(Solo Freelancers)</div>
      </div>

      <div className="absolute top-[15%] right-[25%] translate-x-1/2 -translate-y-1/2 text-center bg-[#FFFFF0E6] p-2 border border-extra-dark max-w-[140px] shadow-sm">
         <div className="font-bold underline text-[10px]">Legacy Giants</div>
         <div className="opacity-60 italic text-[10px]">(Circus, Moris Pub, Grey)</div>
      </div>

      <div className="absolute bottom-[15%] left-[25%] -translate-x-1/2 translate-y-1/2 text-center bg-[#FFFFF0E6] p-2 border border-extra-dark max-w-[140px] shadow-sm">
         <div className="font-bold underline text-[10px]">Emerging Freelancers</div>
      </div>

      <div className="absolute bottom-[15%] right-[25%] translate-x-1/2 translate-y-1/2 text-center bg-[#FFFFF0E6] p-2 border border-extra-dark max-w-[140px] shadow-sm">
         <div className="font-bold underline text-[10px]">Volume Shops</div>
         <div className="opacity-60 italic text-[10px]">(Concreate, Sphere Media)</div>
      </div>

      {/* EXTRA Placement */}
      <div className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-extra-violet text-extra-light font-black px-6 py-3 text-sm tracking-widest z-30 shadow-[6px_6px_0_0_#1A1A2E] transform rotate-[-3deg] hover:rotate-0 transition-transform">
        ★ EXTRA ★
      </div>

      {/* Bottom Label */}
      <div className="uppercase font-bold tracking-widest text-extra-dark bg-extra-light px-4 py-1 border border-extra-dark z-20 shadow-sm">Generalist</div>
    </div>
  </div>
);

type TocEntry = { id: string; label: string; level: number; sub: TocEntry[]; num?: string };

const renumberHeadings = (content: string): string => {
  let h1Counter = 0;
  let h2Counter = 0;
  let inNumberedH1 = false;
  return content.split('\n').map(line => {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      if (/^# \d+\.\s/.test(line)) {
        h1Counter++;
        h2Counter = 0;
        inNumberedH1 = true;
        return line.replace(/^(# )\d+\.\s/, `$1${String(h1Counter).padStart(2, '0')}. `);
      } else {
        inNumberedH1 = false;
        h2Counter = 0;
        return line;
      }
    }
    if (/^## [^#]/.test(line) && inNumberedH1) {
      h2Counter++;
      const stripped = line.replace(/^(## )(?:\d+(?:\.\d+)? |[IVX]+\. )/, '$1');
      return stripped.replace(/^## /, `## ${String(h1Counter).padStart(2, '0')}.${h2Counter} `);
    }
    return line;
  }).join('\n');
};

const extractToc = (content: string): TocEntry[] => {
  const lines = content.split('\n');
  const toc: TocEntry[] = [];
  let currentH1: TocEntry | null = null;

  lines.forEach(line => {
    const h1Match = line.match(/^# (.*)/);
    if (h1Match && !line.startsWith('##')) {
      const label = h1Match[1];
      const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const numMatch = label.match(/^(\d+)\./);
      const num = numMatch ? numMatch[1].padStart(2, '0') : undefined;
      currentH1 = { id, label, level: 1, sub: [], num };
      toc.push(currentH1);
    } else {
      const h2Match = line.match(/^## (.*)/);
      if (h2Match && !line.startsWith('###')) {
        const id = h2Match[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        if (currentH1) {
          currentH1.sub.push({ id, label: h2Match[1], level: 2, sub: [] });
        } else {
          toc.push({ id, label: h2Match[1], level: 2, sub: [] });
        }
      }
    }
  });
  return toc;
};

// --- App ---

interface AppProps {
  pageId: PageId;
}

export default function App({ pageId }: AppProps) {
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const pageConfig = PAGES[pageId];
  const processedContent = useMemo(() => renumberHeadings(pageConfig.content), [pageId]);
  const sections = useMemo(() => extractToc(processedContent), [processedContent]);

  useEffect(() => {
    const handleScroll = () => {
      const headings = Array.from(document.querySelectorAll('h1[id], h2[id]'));
      let currentId = activeHeadingId;

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 250) {
          currentId = heading.id;
          break;
        }
      }

      if (currentId !== activeHeadingId) {
        setActiveHeadingId(currentId);
      }
    };

    const scrollContainer = contentRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [activeHeadingId]);

  const scrollToSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const element = document.getElementById(id);
    if (element && contentRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeH1 = useMemo(() => {
     for (const h1 of sections) {
       if (h1.id === activeHeadingId) return h1.id;
       if (h1.sub.some(h2 => h2.id === activeHeadingId)) return h1.id;
     }
     return sections[0]?.id || '';
  }, [activeHeadingId, sections]);

  const navPages = Object.entries(PAGES).filter(([, config]) => config.showInNav) as [PageId, PageConfig][];

  return (
    <div className="relative font-mono h-screen w-screen overflow-hidden flex flex-col bg-extra-light text-extra-dark">
      <CustomCursor />

      {/* Background Texture */}
      <div className="fixed inset-0 grainy-overlay pointer-events-none z-50"></div>
      <div className="fixed inset-0 dot-grid opacity-15 pointer-events-none z-[5]"></div>

      {/* Header */}
      <header className="h-[80px] border-b border-extra-dark flex items-center px-8 bg-extra-light shrink-0 z-20 relative">
        <ExtraLogoDark className="h-7 w-auto shrink-0 mr-8" />
        <nav className="hidden md:flex items-center gap-8 shrink-0">
          {navPages.map(([id, config]) => (
            pageId === id ? (
              <span key={id} className="text-[11px] font-bold uppercase tracking-widest">
                {config.navLabel}
              </span>
            ) : (
              <a
                key={id}
                href={config.href}
                className="text-[11px] font-bold uppercase tracking-widest text-extra-dark opacity-30 hover:opacity-80 transition-opacity no-underline"
              >
                {config.navLabel}
              </a>
            )
          ))}
        </nav>
        <div className="ml-auto flex items-center shrink-0">
          <select
            value={pageId}
            onChange={(e) => { window.location.href = PAGES[e.target.value as PageId].href; }}
            className="md:hidden text-[10px] font-mono font-bold uppercase bg-extra-light border border-extra-dark px-2 py-1.5 cursor-pointer"
          >
            {navPages.map(([id, config]) => (
              <option key={id} value={id}>{config.navLabel}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10 w-full">

        {/* Navigation Rail Container */}
        <motion.div
           initial={false}
           animate={{ width: isSidebarOpen ? 320 : 96 }}
           transition={{ type: "spring", stiffness: 300, damping: 30 }}
           className="relative h-full z-30 shrink-0 hidden md:flex border-r border-extra-dark bg-extra-light overflow-hidden flex-row shadow-[4px_0_0_0_#1A1A2E1A]"
        >
          {/* Permanent Minimal Nav Indicator */}
          <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col items-center py-8 gap-4 border-r border-[#1A1A2E33] z-20 bg-extra-light overflow-y-auto shrink-0">
             {sections.map(section => {
               const isH1Active = activeH1 === section.id;
               return (
                 <button
                    key={`min-${section.id}`}
                    onClick={(e) => scrollToSection(section.id, e)}
                    className={`text-[12px] font-bold py-2 px-1 relative transition-colors ${
                      isH1Active ? 'text-extra-violet' : 'text-extra-dark opacity-50 hover:opacity-100'
                    }`}
                 >
                    {isH1Active && (
                        <motion.div
                          layoutId="min-nav-indicator"
                          className="absolute left-1/2 -top-1 -translate-x-1/2 w-1 h-1 bg-extra-violet rounded-full"
                        />
                    )}
                    {section.num}
                 </button>
               );
             })}
          </div>

          {/* Full Index Drawer */}
          <div className="absolute left-16 top-0 bottom-0 right-8 z-10 bg-extra-light overflow-y-auto overflow-x-hidden">
                <div className="w-[224px] py-8 px-6 flex flex-col gap-6 h-full">
                  <span className="uppercase font-black text-[12px] tracking-widest border-b border-extra-dark pb-4">Index</span>

                  {/* Table of contents */}
                  <nav className="flex flex-col gap-3">
                    {sections.map((section) => {
                      const isH1Active = activeH1 === section.id;
                      return (
                        <div key={section.id} className="flex flex-col">
                          <button
                            onClick={(e) => scrollToSection(section.id, e)}
                            className={`text-left text-[12px] font-bold transition-all relative py-1 pl-3 cursor-pointer ${
                              isH1Active ? 'text-extra-violet' : 'text-extra-dark opacity-60 hover:opacity-100'
                            }`}
                          >
                            {isH1Active && (
                              <motion.div
                                 layoutId="nav-indicator"
                                 className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-extra-violet rounded-full"
                              />
                            )}
                            {section.label}
                          </button>
                          <AnimatePresence>
                             {isH1Active && section.sub.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="flex flex-col pl-4 border-l border-[#1A1A2E33] ml-[5px] overflow-hidden"
                                >
                                   {section.sub.map((sub) => {
                                     const isH2Active = activeHeadingId === sub.id;
                                     return (
                                       <button
                                         key={sub.id}
                                         onClick={(e) => scrollToSection(sub.id, e)}
                                         className={`text-left text-[12px] font-bold py-1.5 pl-3 relative transition-all truncate group ${
                                           isH2Active ? 'text-extra-violet' : 'text-extra-dark opacity-50 hover:opacity-100'
                                         }`}
                                       >
                                         <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-[1px] bg-[#1A1A2E33] group-hover:bg-[#1A1A2E80] transition-colors"></span>
                                         {sub.label}
                                       </button>
                                     );
                                   })}
                                </motion.div>
                             )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </nav>
                </div>
          </div>

          {/* Drawer Handle */}
          <div className="absolute right-0 top-0 bottom-0 w-8 z-30 bg-extra-light border-l border-[#1A1A2E33]">
              <button
                 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                 className="absolute top-1/2 -translate-y-1/2 w-full h-32 border-y border-extra-dark flex justify-center items-center hover:bg-extra-dark hover:text-extra-light transition-colors cursor-pointer group bg-extra-light"
                 title="Toggle Index Drawer"
              >
                 <span className="text-[12px] font-bold uppercase rotate-90 tracking-widest pointer-events-none origin-center text-current whitespace-nowrap">Index</span>
              </button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto scroll-smooth relative px-8 bg-extra-light">
          <main id="printable-content" className="max-w-[70ch] mx-auto py-24 pb-48 w-full block">
             <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, children, ...props}) => {
                     const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                     return <h1 id={id} className="text-[36px] font-black uppercase leading-[1.1] mb-12 mt-40 first:mt-0 border-t-[6px] border-extra-dark pt-12 scroll-mt-24 w-full" {...props}>{children}</h1>
                  },
                  h2: ({node, children, ...props}) => {
                     const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                     return <h2 id={id} className="text-[24px] font-bold uppercase mb-8 mt-24 pb-4 border-b-2 border-[#1A1A2E33] scroll-mt-24 w-full" {...props}>{children}</h2>
                  },
                  h3: ({node, ...props}) => <h3 className="text-[16px] font-bold uppercase mb-6 mt-12 w-full" {...props} />,
                  p: ({node, ...props}) => <p className="text-[12px] leading-[1.8] mb-8 font-medium w-full" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-square pl-8 mb-10 space-y-4 text-[12px] leading-[1.8] font-medium w-full" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-8 mb-10 space-y-4 text-[12px] leading-[1.8] font-bold w-full" {...props} />,
                  li: ({node, ...props}) => <li className="marker:text-extra-violet" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="my-16 w-full xl:w-[110%] xl:-ml-[5%] [&>p]:!text-[24px] [&>p]:!font-normal [&>p]:!italic [&>p]:!opacity-90 [&>p]:!leading-relaxed [&>p]:!border-none" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-black" {...props} />,
                  em: ({node, ...props}) => <em className="italic opacity-80" {...props} />,
                  table: ({node, ...props}) => <div className="w-full xl:w-[120%] xl:-ml-[10%] overflow-x-auto mb-16 mt-8"><table className="w-full text-left border-2 border-extra-dark" {...props} /></div>,
                  th: ({node, ...props}) => <th className="border-b-2 border-extra-dark p-4 font-black uppercase text-[12px] tracking-widest" {...props} />,
                  td: ({node, ...props}) => <td className="border-b border-[#1A1A2E33] p-4 text-[12px] font-medium" {...props} />,
                  code: ({node, inline, children, ...props}: any) => {
                    const textContent = String(children);
                    if (!inline && textContent.includes('★ EXTRA ★')) {
                      return <MarketGrid />;
                    }
                    return inline ? <code className="bg-[#1A1A2E1A] px-1.5 py-0.5 border border-[#1A1A2E33] text-[0.9em] font-black tracking-tight" {...props}>{children}</code> : <div className="w-full xl:w-[120%] xl:-ml-[10%] bg-extra-dark text-extra-light p-8 mb-12 border-2 border-extra-dark overflow-x-auto shadow-hard"><code className="text-xs font-mono whitespace-pre" {...props}>{children}</code></div>;
                  },
                  hr: ({node, ...props}) => <hr className="w-full border-t-2 border-[#1A1A2E4D] border-dashed my-20" {...props} />,
                }}
             >
               {processedContent}
             </Markdown>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-[40px] border-t border-extra-dark bg-extra-light text-extra-dark flex items-center px-8 justify-between shrink-0 z-20 relative">
        <div className="flex gap-8 text-[10px] font-bold tracking-widest opacity-60">
          <span>© 2026 EXTRA</span>
          <span>RESTRICTED DIST.</span>
        </div>
      </footer>
    </div>
  );
}
