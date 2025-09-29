import React, { useEffect, useState } from "react"
import { AnimatePresence, motion, MotionConfig } from "framer-motion"
import { ChevronDownIcon, X, Search, Plus } from "lucide-react"
import { Sheet, useClientMediaQuery, SheetViewProps } from "@silk-hq/components"

type TSelectData = {
  id: string
  label: string
  value: string
  description?: string
  icon?: string
  disabled?: boolean
  custom?: React.ReactNode
}

type SelectProps = {
  data?: TSelectData[]
  onChange?: (value: string) => void
  defaultValue?: string
  onOpenChange?: (open: boolean) => void
}

const Select = ({ data, defaultValue, onOpenChange, onChange }: SelectProps) => {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<TSelectData | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredData, setFilteredData] = useState<TSelectData[]>(data || [])

  useEffect(() => {
    if (defaultValue) {
      const item = data?.find((i) => i.value === defaultValue)
      if (item) {
        setSelected(item)
      }
    } else {
      setSelected(data?.[0])
    }
  }, [defaultValue, data])

  useEffect(() => {
    setFilteredData(data || [])
  }, [data])

  useEffect(() => {
    if (searchTerm) {
      const filtered = data?.filter(item =>
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      ) || []
      setFilteredData(filtered)
    } else {
      setFilteredData(data || [])
    }
  }, [searchTerm, data])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        onOpenChange?.(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onOpenChange])

  const onSelect = (value: string) => {
    const item = data?.find((i) => i.value === value)
    setSelected(item as TSelectData)

    // Reset search state immediately
    setSearchTerm("")
    setFilteredData(data || [])

    setOpen(false)
    onOpenChange?.(false)

    // Wait for animation to complete before triggering navigation
    setTimeout(() => {
      onChange?.(value)
    }, 150)
  }

  return (
    <MotionConfig
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      <motion.div className="flex items-center justify-center" ref={containerRef}>
        <AnimatePresence mode="popLayout">
          {!open ? (
            <motion.div
              whileTap={{ scale: 0.95 }}
              animate={{
                borderRadius: 30,
              }}
              layout
              layoutId="dropdown"
              onClick={() => {
                setOpen(true)
                onOpenChange?.(true)
              }}
              className="overflow-hidden rounded-[30px] border border-gray-300 bg-white shadow-sm cursor-pointer"
            >
              <SelectItem item={selected} />
            </motion.div>
          ) : (
            <motion.div
              layout
              animate={{
                borderRadius: 20,
              }}
              layoutId="dropdown"
              className="overflow-hidden rounded-[20px] w-[400px] border border-gray-300 bg-white py-2 shadow-md absolute top-0 left-0 z-50"
            >
              <Head onCloseDropdown={() => {
                setOpen(false)
                onOpenChange?.(false)
              }} />
              <div className="px-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="w-full overflow-y-auto">
                {filteredData.map((item) => (
                  <SelectItem
                    order={item?.value}
                    noDescription={false}
                    key={item.id}
                    item={item}
                    onChange={onSelect}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  )
}

const ProjectTemplateSelect = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<TSelectData | undefined>(undefined)

  const templateData: TSelectData[] = [
    {
      id: '1',
      label: 'Dashboard Template',
      value: 'dashboard',
      description: 'Analytics and reporting dashboard',
      icon: '📊',
    },
    {
      id: '2',
      label: 'Mobile App Template',
      value: 'mobile_app',
      description: 'React Native or Flutter mobile app',
      icon: '📱',
    },
    {
      id: '3',
      label: 'API Gateway Template',
      value: 'api_gateway',
      description: 'REST API backend with authentication',
      icon: '🔗',
    },
    {
      id: '4',
      label: 'Marketing Website',
      value: 'marketing_site',
      description: 'Landing page with CMS integration',
      icon: '🌐',
    },
    {
      id: '5',
      label: 'E-commerce Platform',
      value: 'ecommerce',
      description: 'Online store with payment processing',
      icon: '🛒',
    },
    {
      id: '6',
      label: 'Blank Project',
      value: 'blank',
      description: 'Start from scratch with minimal setup',
      icon: '📄',
    },
  ]

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

const TemplateSelectItem = ({ item, onClick, isOption = false }: TemplateSelectItemProps) => {
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

export default Select

const Head = ({ onCloseDropdown }: { onCloseDropdown: () => void }) => {
  const largeViewport = useClientMediaQuery("(min-width: 650px)")
  const contentPlacement = largeViewport ? "center" : "bottom"
  const tracks: SheetViewProps["tracks"] = largeViewport ? ["top", "bottom"] : "bottom"
  const [shouldTriggerSheet, setShouldTriggerSheet] = useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // First close the dropdown
    onCloseDropdown()
    // Then after animation, trigger the sheet
    setTimeout(() => {
      setShouldTriggerSheet(true)
    }, 200)
  }

  // Programmatically trigger the sheet
  React.useEffect(() => {
    if (shouldTriggerSheet && triggerRef.current) {
      triggerRef.current.click()
      setShouldTriggerSheet(false)
    }
  }, [shouldTriggerSheet])

  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      transition={{
        delay: 0.1,
      }}
      layout
      className="flex items-center justify-between p-4"
    >
      <motion.strong layout className="text-gray-900">
        Projects
      </motion.strong>

      <Sheet.Root license="commercial">
        <Sheet.Trigger asChild>
          <motion.button
            ref={triggerRef}
            layout
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
            onClick={handlePlusClick}
          >
            <Plus className="w-4 h-4 text-white" />
          </motion.button>
        </Sheet.Trigger>

        <Sheet.Portal>
          <Sheet.View
            className="z-[100]"
            contentPlacement={contentPlacement}
            tracks={tracks}
            nativeEdgeSwipePrevention={true}
          >
            <Sheet.Backdrop
              travelAnimation={{
                opacity: ({ progress }: { progress: number }) => Math.min(progress * 0.2, 0.2),
              }}
              themeColorDimming="auto"
            />
            <Sheet.Content className="max-w-[650px] h-auto min-h-[200px] bg-transparent p-[6px]">
              <div className="h-full rounded-lg bg-white shadow-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Create New Project</h2>
                    <Sheet.Trigger action="dismiss" asChild>
                      <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </Sheet.Trigger>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Project Name</label>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter project name"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Description</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Brief description of the project"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Project Template</label>
                      <ProjectTemplateSelect />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Sheet.Trigger action="dismiss" asChild>
                        <button
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          onClick={() => {
                            // Project creation logic here
                            console.log('Creating new project...');
                          }}
                        >
                          Create Project
                        </button>
                      </Sheet.Trigger>
                      <Sheet.Trigger action="dismiss" asChild>
                        <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">
                          Cancel
                        </button>
                      </Sheet.Trigger>
                    </div>
                  </div>
                </div>
              </div>
            </Sheet.Content>
          </Sheet.View>
        </Sheet.Portal>
      </Sheet.Root>
    </motion.div>
  )
}

type SelectItemProps = {
  item?: TSelectData
  noDescription?: boolean
  order?: string
  onChange?: (index: string) => void
}

const animation = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: (custom: number) => ({
      delay: custom * 0.1,
      duration: 0.5,
    }),
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: (custom: number) => ({
      delay: custom * 0.1,
    }),
  },
}

const SelectItem = ({
  item,
  noDescription = true,
  order,
  onChange,
}: SelectItemProps) => {
  return (
    <motion.div
      className={`group flex cursor-pointer items-center justify-between gap-2 p-4 py-2 hover:bg-gray-50 hover:text-gray-900 ${
        noDescription && "!p-2"
      }`}
      variants={animation}
      initial="hidden"
      animate="visible"
      exit="exit"
      key={"product-" + item?.id + "-order-" + order}
      custom={order}
      onClick={() => onChange?.(order as string)}
    >
      <div className="flex items-center gap-3">
        <motion.div
          layout
          layoutId={`icon-${item?.id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300"
        >
          {item?.icon}
        </motion.div>
        <motion.div layout className="flex w-56 flex-col">
          <motion.strong
            layoutId={`label-${item?.id}`}
            className="text-sm font-semibold text-gray-900"
          >
            {item?.label}
          </motion.strong>
          {noDescription ? null : (
            <span className="truncate text-xs text-gray-500">
              {item?.description}
            </span>
          )}
        </motion.div>
      </div>
      {noDescription ? (
        <motion.div
          layout
          className="flex items-center justify-center gap-2 pr-3"
        >
          <ChevronDownIcon className="text-gray-900" size={20} />
        </motion.div>
      ) : null}
    </motion.div>
  )
}