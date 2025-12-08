"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ExpandableCardProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
  classNameExpanded?: string;
  icon?: React.ReactNode;
  category?: string;
  [key: string]: unknown;
}

export function ExpandableCard({
  title,
  description,
  children,
  className,
  classNameExpanded,
  icon,
  category,
  ...props
}: ExpandableCardProps) {
  const [active, setActive] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActive(false);
      }
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setActive(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-md h-full w-full z-10"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && (
          <div
            className={cn(
              "fixed inset-0 grid place-items-center z-[100] sm:mt-16 before:pointer-events-none",
            )}
          >
            <motion.div
              layoutId={`card-${title}-${id}`}
              ref={cardRef}
              className={cn(
                "w-full max-w-[850px] h-full flex flex-col overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] sm:rounded-3xl bg-white shadow-xl dark:shadow-none dark:bg-gray-900 relative border border-gray-200 dark:border-gray-800",
                classNameExpanded,
              )}
              {...props}
            >
              {/* Header Section */}
              <motion.div 
                layoutId={`header-container-${id}`}
                className="relative border-b border-gray-100 dark:border-gray-800 p-8 flex justify-between items-start"
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon */}
                  <motion.div 
                    layoutId={`icon-${title}-${id}`}
                    className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg"
                  >
                    {icon || (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </motion.div>
                  
                  <motion.div 
                    layoutId={`content-wrapper-${id}`}
                    className="flex-1 min-w-0"
                  >
                    <motion.div 
                      layoutId={`category-${category}-${id}`}
                      className="inline-block"
                    >
                      {category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mb-2">
                          {category}
                        </span>
                      )}
                    </motion.div>
                    <motion.h3
                      layoutId={`title-${title}-${id}`}
                      className="font-bold text-gray-900 dark:text-white text-2xl sm:text-3xl mb-2"
                    >
                      {title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${description}-${id}`}
                      className="text-gray-600 dark:text-gray-400 text-base leading-relaxed"
                    >
                      {description}
                    </motion.p>
                  </motion.div>
                </div>
                
                <motion.button
                  aria-label="Close card"
                  layoutId={`button-${title}-${id}`}
                  className="ml-4 h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => setActive(false)}
                >
                  <motion.div
                    animate={{ rotate: active ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                  </motion.div>
                </motion.button>
              </motion.div>

              {/* Content Section */}
              <motion.div 
                layoutId={`content-section-${id}`}
                className="flex-1 p-8"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-gray-700 dark:text-gray-300 text-base flex flex-col items-start gap-6 h-full"
                >
                  {children}
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div
        role="dialog"
        aria-labelledby={`card-title-${id}`}
        aria-modal="true"
        layoutId={`card-${title}-${id}`}
        onClick={() => setActive(true)}
        className={cn(
          "p-6 bg-white dark:bg-gray-900 rounded-2xl cursor-pointer border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 group max-w-sm",
          className,
        )}
      >
        <motion.div 
          layoutId={`header-container-${id}`}
          className="flex items-start gap-4"
        >
          {/* Icon */}
          <motion.div 
            layoutId={`icon-${title}-${id}`}
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow duration-200"
          >
            {icon || (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </motion.div>
          
          <motion.div 
            layoutId={`content-wrapper-${id}`}
            className="flex-1 min-w-0"
          >
            <motion.div 
              layoutId={`category-${category}-${id}`}
              className="inline-block mb-1"
            >
              {category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                  {category}
                </span>
              )}
            </motion.div>
            
            <motion.h3
              layoutId={`title-${title}-${id}`}
              className="text-gray-900 dark:text-white font-semibold text-lg mb-2 line-clamp-2"
            >
              {title}
            </motion.h3>
            
            <motion.p
              layoutId={`description-${description}-${id}`}
              className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-2"
            >
              {description}
            </motion.p>
          </motion.div>
          
          <motion.button
            aria-label="Open card"
            layoutId={`button-${title}-${id}`}
            className="ml-2 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 opacity-0 group-hover:opacity-100"
          >
            <motion.div
              animate={{ rotate: active ? 45 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </motion.div>
          </motion.button>
        </motion.div>
        
        {/* Hidden content section for layout transition */}
        <motion.div 
          layoutId={`content-section-${id}`}
          className="h-0 overflow-hidden"
        >
          <div className="opacity-0">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}