-- Adicionar constraint de telefone único na tabela profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);

-- Criar bucket para fotos de barbeiros (se não existir)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('barber-photos', 'barber-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para visualização pública das fotos
CREATE POLICY "Fotos de barbeiros são públicas" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'barber-photos');

-- Política para admin fazer upload
CREATE POLICY "Admins podem fazer upload de fotos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'barber-photos' AND has_role(auth.uid(), 'admin'::app_role));

-- Política para admin deletar fotos
CREATE POLICY "Admins podem deletar fotos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'barber-photos' AND has_role(auth.uid(), 'admin'::app_role));