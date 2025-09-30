"use client"

import React, { useState, useEffect } from "react"
import { AnimatePresence, motion, MotionConfig } from "framer-motion"
import { ChevronDownIcon } from "lucide-react"
import { templateData } from "./project-creation-sheet"

type TSelectData = {
  id: string
  label: string
  value: string
  description?: string
  icon?: string
  disabled?: boolean
  custom?: React.ReactNode
}

export function ProjectTemplateSelect() {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<TSelectData | undefined>(undefined)

  useEffect(() => {
    setSelected(templateData[0])
  }, [])

  const handleSelect = (value: string) => {
    const item = templateData.find(t => t.value === value)
    if (item) {
      setSelected(item)
      setIsOpen(false)
    }
  }

  return (
    <MotionConfig
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      <div className="relative">
        <AnimatePresence mode="popLayout">
          {!isOpen ? (
            <motion.div
              whileTap={{ scale: 0.95 }}
              animate={{
                borderRadius: 8,
              }}
              layout
              layoutId="template-dropdown"
              onClick={() => setIsOpen(true)}
              className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm cursor-pointer"
            >
              <TemplateSelectItem item={selected} />
            </motion.div>
          ) : (
            <motion.div
              layout
              animate={{
                borderRadius: 12,
              }}
              layoutId="template-dropdown"
              className="overflow-hidden rounded-xl w-full border border-gray-300 bg-white py-2 shadow-lg absolute top-0 left-0 z-50 max-h-60"
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Choose Template</h3>
              </div>
              <div className="overflow-y-auto max-h-48">
                {templateData.map((item) => (
                  <TemplateSelectItem
                    key={item.id}
                    item={item}
                    onClick={() => handleSelect(item.value)}
                    isOption={true}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </MotionConfig>
  )
}

type TemplateSelectItemProps = {
  item?: TSelectData
  onClick?: () => void
  isOption?: boolean
}

function TemplateSelectItem({ item, onClick, isOption = false }: TemplateSelectItemProps) {
  if (!item) return null

  return (
    <div
      className={`flex items-center gap-3 p-3 ${isOption ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="text-2xl flex-shrink-0">{item.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{item.label}</div>
        {item.description && (
          <div className="text-sm text-gray-500 truncate">{item.description}</div>
        )}
      </div>
      {!isOption && (
        <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
    </div>
  )
}