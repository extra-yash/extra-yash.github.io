/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Menu, Download } from 'lucide-react';
import { strategyContent } from './content';

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

      {/* EXTRA Placement: halfway along positive Y axis */}
      <div className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-extra-violet text-extra-light font-black px-6 py-3 text-sm tracking-widest z-30 shadow-[6px_6px_0_0_#1A1A2E] transform rotate-[-3deg] hover:rotate-0 transition-transform">
        ★ EXTRA ★
      </div>

      {/* Bottom Label */}
      <div className="uppercase font-bold tracking-widest text-extra-dark bg-extra-light px-4 py-1 border border-extra-dark z-20 shadow-sm">Generalist</div>
    </div>
  </div>
);

type TocEntry = { id: string; label: string; level: number; sub: TocEntry[]; num?: string };

export default function App() {
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const extractToc = () => {
    const lines = strategyContent.split('\n');
    const toc: TocEntry[] = [];
    let currentH1: TocEntry | null = null;
    let h1Count = -1;
    
    lines.forEach(line => {
      const h1Match = line.match(/^# (.*)/);
      if (h1Match && !line.startsWith('##')) {
         h1Count++;
         const id = h1Match[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
         currentH1 = { id, label: h1Match[1], level: 1, sub: [], num: String(h1Count).padStart(2, '0') };
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

  const sections = useMemo(() => extractToc(), []);

  useEffect(() => {
    const handleScroll = () => {
      const headings = Array.from(document.querySelectorAll('h1[id], h2[id]'));
      let currentId = activeHeadingId;
      
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        const rect = heading.getBoundingClientRect();
        // 250px from top of viewport catches headings right as they pass the top 1/3
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

  return (
    <div className="relative font-mono h-screen w-screen overflow-hidden flex flex-col bg-extra-light text-extra-dark">
      <CustomCursor />
      
      {/* Background Texture */}
      <div className="fixed inset-0 grainy-overlay pointer-events-none z-50"></div>
      <div className="fixed inset-0 dot-grid opacity-15 pointer-events-none z-[5]"></div>

      {/* Header */}
      <header className="h-[80px] border-b border-extra-dark flex items-center justify-between px-8 bg-extra-light shrink-0 z-20 relative">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black uppercase tracking-tighter">Extra Brand Strategy</h1>
        </div>
        <div className="flex gap-6 items-center">
          <span className="text-[12px] font-bold opacity-50">DOCUMENT 01</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10 w-full">
        {/* Navigation Rail Container */}
        <motion.div 
           initial={false}
           animate={{ width: isSidebarOpen ? 320 : 96 }} // 64 minimal + 32 tab
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

          <div className="absolute left-16 top-0 bottom-0 right-8 z-10 bg-extra-light overflow-y-auto overflow-x-hidden">
                <div className="w-[224px] py-8 px-6 flex flex-col gap-6 h-full">
                  <span className="uppercase font-black text-[12px] tracking-widest border-b border-extra-dark pb-4">Index</span>
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
          
          {/* Drawer Handle INSIDE container */}
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

        {/* Main Content Scrollable Area centered with editorial layout */}
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
               {strategyContent}
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



