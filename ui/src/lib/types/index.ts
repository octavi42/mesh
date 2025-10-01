export type SelectData = {
  id: string
  label: string
  value: string
  description?: string
  icon?: string
  disabled?: boolean
  custom?: React.ReactNode
}

export type Project = {
  id: string
  label: string
  value: string
  description: string
  icon: string
}

export type Chat = {
  id: string
  title: string
}