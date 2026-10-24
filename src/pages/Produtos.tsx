import { formatCurrency } from '@/lib/formatCurrency';
import { useVisibleRefresh } from '@/hooks/useVisibleRefresh';
import { isAgendaDemo, demoProducts } from "@/lib/agendaDemo";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';


import { ShoppingBag, Package, ShoppingCart } from '@/components/animated-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from '@/components/animated-icons';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { withAgendaPublicSearch } from '@/lib/agendaPublicLink';



interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const headerRef = useRef<HTMLDivElement>(null);
  const { addItem, setIsOpen, itemCount } = useCart();
  const { user } = useAuth();
  const { settings } = useAgendaBranding();
  const navigate = useNavigate();
  const publicPath = (path: string) => withAgendaPublicSearch(path, settings);

  const fetchProducts = useCallback(async () => {
    if (isAgendaDemo) { setProducts(demoProducts); setLoading(false); return; }
    if (!settings.storeAccountId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('agenda_products')
      .select('*')
      .eq('store_account_id', settings.storeAccountId)
      .eq('is_active', true)
      .order('name');
    if (data) setProducts(data);
    setLoading(false);
  }, [settings.storeAccountId]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);
  useVisibleRefresh(()=>void fetchProducts(),!!settings.storeAccountId);

  useEffect(() => {
    const handleProductsUpdated = () => {
      void fetchProducts();
    };

    window.addEventListener('agenda-products-updated', handleProductsUpdated);
    return () => window.removeEventListener('agenda-products-updated', handleProductsUpdated);
  }, [fetchProducts]);

  const handleBuy = (product: Product) => {
    if (!user && !isAgendaDemo) return;
    if (product.stock_quantity <= 0) return;
    addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
  };

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const filteredProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div ref={headerRef} className="page-intro"><div><h1>Produtos <span className="text-primary">e cuidados.</span></h1><p>Escolha os produtos da sua barbearia.</p></div></div>

        {/* Cart FAB - only for logged-in users */}
        {(user || isAgendaDemo) && itemCount > 0 && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 z-50 bg-primary text-primary-foreground w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {itemCount}
            </span>
          </button>
        )}

        {categories.length > 0 && (
          <div className="catalog-filters flex gap-2 mb-4 overflow-x-auto pb-2">
            <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} size="sm" className="rounded-full shrink-0" onClick={() => setSelectedCategory('all')}>
              Todos
            </Button>
            {categories.map(cat => (
              <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm" className="rounded-full shrink-0" onClick={() => setSelectedCategory(cat)}>
                {cat}
              </Button>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">Nenhum produto disponível</h2>
            <p className="text-muted-foreground">Em breve teremos novidades para você!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map(product => (
              <Card key={product.id} className="product-card overflow-hidden hover:shadow-lg transition-shadow group h-full">
                <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  {product.stock_quantity <= 0 && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Badge variant="destructive" className="text-xs">Esgotado</Badge>
                    </div>
                  )}
                  {product.category && <Badge className="absolute top-2 left-2 text-xs" variant="secondary">{product.category}</Badge>}
                </div>
                <CardContent className="p-3 flex flex-col gap-2">
                  <h3 className="font-medium text-sm sm:text-base line-clamp-1">{product.name}</h3>
                  {product.description && <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-base sm:text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
                    {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                      <span className="text-[10px] text-amber-600 whitespace-nowrap">{product.stock_quantity} un</span>
                    )}
                  </div>
                  {user || isAgendaDemo ? (
                    <Button size="sm" className="w-full mt-1 rounded-full gap-2" disabled={product.stock_quantity <= 0} onClick={() => handleBuy(product)}>
                      <ShoppingCart className="w-4 h-4" />
                      {product.stock_quantity <= 0 ? 'Indisponível' : 'Adicionar'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full mt-1 rounded-full gap-2" onClick={() => navigate(publicPath('/login'))}>
                      Faça login para comprar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
