/** Catálogo fictício para testes locais. Nunca habilitado no build de produção. */
export const isAgendaDemo = import.meta.env.DEV && import.meta.env.VITE_AGENDA_DEMO === 'true';

export const demoServices = [
  { id: 'demo-service-1', name: 'Corte tradicional', description: 'Corte na tesoura ou máquina com finalização.', price: 35, duration_minutes: 30, is_active: true },
  { id: 'demo-service-2', name: 'Degradê', description: 'Degradê com acabamento e finalização.', price: 45, duration_minutes: 45, is_active: true },
  { id: 'demo-service-3', name: 'Barba completa', description: 'Modelagem de barba e toalha quente.', price: 30, duration_minutes: 30, is_active: true },
  { id: 'demo-service-4', name: 'Combo corte e barba', description: 'Corte completo com modelagem de barba.', price: 65, duration_minutes: 60, is_active: true },
  { id: 'demo-service-5', name: 'Sobrancelha', description: 'Acabamento e alinhamento.', price: 15, duration_minutes: 15, is_active: true },
  { id: 'demo-service-6', name: 'Hidratação capilar', description: 'Tratamento de hidratação e finalização.', price: 40, duration_minutes: 30, is_active: true },
];

export const demoBarbers = [
  { id: 'demo-barber-1', name: 'Lucas Almeida', bio: 'Especialista em degradê e cortes modernos.', photo_url: null, email: null, phone: null, user_id: null, commission: 10, is_active: true },
  { id: 'demo-barber-2', name: 'Rafael Costa', bio: 'Cortes clássicos e cuidados com a barba.', photo_url: null, email: null, phone: null, user_id: null, commission: 12, is_active: true },
  { id: 'demo-barber-3', name: 'Bruno Santos', bio: 'Cortes na tesoura e atendimento personalizado.', photo_url: null, email: null, phone: null, user_id: null, commission: 10, is_active: true },
];

export const demoProducts = [
  { id: 'demo-product-1', name: 'Pomada modeladora matte', description: 'Fixação média e acabamento sem brilho, 80 g.', price: 39.90, stock_quantity: 20, category: 'Cabelo', image_url: null, is_active: true },
  { id: 'demo-product-2', name: 'Shampoo refrescante', description: 'Limpeza diária para cabelo e couro cabeludo, 250 ml.', price: 29.90, stock_quantity: 15, category: 'Cabelo', image_url: null, is_active: true },
  { id: 'demo-product-3', name: 'Óleo para barba', description: 'Hidratação e maciez para a barba, 30 ml.', price: 34.90, stock_quantity: 4, category: 'Barba', image_url: null, is_active: true },
  { id: 'demo-product-4', name: 'Balm para barba', description: 'Modelagem leve e hidratação, 100 g.', price: 44.90, stock_quantity: 10, category: 'Barba', image_url: null, is_active: true },
  { id: 'demo-product-5', name: 'Pente de madeira', description: 'Pente de bolso para cabelo e barba.', price: 19.90, stock_quantity: 0, category: 'Acessórios', image_url: null, is_active: true },
  { id: 'demo-product-6', name: 'Kit cuidado completo', description: 'Shampoo, pomada e óleo para barba.', price: 89.90, stock_quantity: 8, category: 'Kits', image_url: null, is_active: true },
];

export const demoBusinessHours = Array.from({ length: 7 }, (_, day) => ({
  id: `demo-hours-${day}`, day_of_week: day, open_time: '09:00', close_time: '19:30', is_open: day !== 0,
}));
