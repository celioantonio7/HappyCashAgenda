import { CalendarDays, Clock, Crown, FileText, User, LayoutDashboard, ClipboardList, Users, DollarSign, Package, ShoppingBag, Gift, MapPin, Palette, Monitor, Scissors } from '@/components/animated-icons';
export const clientNavigation = [
  { label: 'Agendar', path: '/agendamento', icon: CalendarDays },
  { label: 'Histórico', path: '/meus-agendamentos', icon: Clock },
  { label: 'Assinatura', path: '/assinatura', icon: Crown },
  { label: 'Feed', path: '/feed', icon: FileText },
  { label: 'Perfil', path: '/perfil', icon: User },
];
export const ownerGroups = [
  { label: 'Operação', items: [{label:'Visão geral', tab:'overview',icon:LayoutDashboard},{label:'Fila',tab:'queue',icon:Users},{label:'Agendamentos',tab:'appointments',icon:CalendarDays}] },
  { label: 'Equipe', items: [{label:'Profissionais',tab:'barbers',icon:Scissors},{label:'Comissões',tab:'commissions',icon:DollarSign},{label:'Horários',tab:'hours',icon:Clock}] },
  { label: 'Comercial', items: [{label:'Serviços',tab:'services',icon:ClipboardList},{label:'Produtos',tab:'products',icon:Package},{label:'Vendas',tab:'product-sales',icon:ShoppingBag},{label:'Clientes',tab:'clients',icon:Users},{label:'Fidelidade',tab:'loyalty',icon:Gift},{label:'Publicações',tab:'publications',icon:FileText}] },
  { label: 'Configurações', items: [{label:'Localizações',tab:'locations',icon:MapPin},{label:'Identidade',tab:'branding',icon:Palette},{label:'Agendamento e contato',tab:'public-page',icon:Monitor},{label:'Histórico de alterações',tab:'audit',icon:ClipboardList}] },
];
