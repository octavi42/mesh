import React, { useEffect, useState } from "react"
import { AnimatePresence, motion, MotionConfig } from "framer-motion"
import { ChevronDownIcon, X, Search } from "lucide-react"

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
              <Head />
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

export default Select

const Head = () => {
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
      className="flex items-center justify-center p-4"
    >
      <motion.strong layout className="text-gray-900">
        Choose Project
      </motion.strong>
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