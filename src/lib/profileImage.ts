/** Small, decoded raster images only; personal avatars fit the existing profile field. */
export async function prepareProfileImage(file: File, size = 192): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Escolha uma foto de até 8 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a foto.');
    const side=Math.min(bitmap.width,bitmap.height);
    ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);
    const result=canvas.toDataURL('image/webp',.78);
    if(result.length>90000)throw new Error('Escolha uma foto com menos detalhes.');
    return result;
  } finally {bitmap.close();}
}

export async function uploadCollectionPhoto(store: string, kind: 'services'|'clients', id: string, image: string) {
  const { supabase } = await import('@/integrations/supabase/client');
  const blob=await (await fetch(image)).blob();
  const {error}=await supabase.storage.from('product-images').upload(`${store}/${kind}/${id}.webp`,blob,{contentType:'image/webp',upsert:true,cacheControl:'0'});
  if(error)throw error;
}
