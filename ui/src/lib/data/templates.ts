import { type SelectData } from "@/lib/types"

export const templateData: SelectData[] = [
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