-- Adicionar campo de comissão (valor fixo em reais) na tabela barbers
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS commission numeric NOT NULL DEFAULT 0;

-- Adicionar role 'barber' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'barber';

-- Criar tabela de produtos para a loja
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  category text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de produtos
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Política: Público pode visualizar produtos ativos
CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
USING (is_active = true);

-- Política: Admins podem gerenciar todos os produtos
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Vincular barbeiro a um user_id para login próprio
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Política: Barbeiro pode ver seus próprios dados
CREATE POLICY "Barber can view own data"
ON public.barbers
FOR SELECT
USING (auth.uid() = user_id);

-- Criar bucket de storage para imagens de produtos
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Público pode ver imagens de produtos
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Política: Admins podem gerenciar imagens de produtos
CREATE POLICY "Admins can manage product images"
ON storage.objects
FOR ALL
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));