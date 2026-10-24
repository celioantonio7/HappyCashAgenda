import { useVisibleRefresh } from '@/hooks/useVisibleRefresh';
import { CollectionPhoto } from '@/components/app/CollectionPhoto';
import { ListMore } from '@/components/app/ListMore';
import { prepareProfileImage, uploadCollectionPhoto } from '@/lib/profileImage';
/**
 * Aba de Clientes do Painel Admin
 * - CRUD de clientes manuais
 * - Listagem com busca
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Edit, Trash2, Users, Search, Phone, Mail } from "@/components/animated-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAgendaBranding } from "@/hooks/useAgendaBranding";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Client {
  updated_at?: string;
  id: string;
  store_account_id: string;
  owner_user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export function ClientsTab() {
  const [limit,setLimit]=useState(10);
  const [photo,setPhoto]=useState<string|null>(null);
  const [photoVersion,setPhotoVersion]=useState(0);
  const [preparingPhoto,setPreparingPhoto]=useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const { toast } = useToast();
  const { settings } = useAgendaBranding();

  const fetchClients = useCallback(async () => {
    if (!settings.storeAccountId) {
      setClients([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("agenda_clients")
      .select("*")
      .eq("store_account_id", settings.storeAccountId)
      .order("name");
    if (data) setClients(data);
    setLoading(false);
  }, [settings.storeAccountId]);

  useVisibleRefresh(()=>void fetchClients(),!!settings.storeAccountId);

  useEffect(() => {
    if (!settings.storeAccountId) {
      setClients([]);
      setLoading(false);
      return;
    }

    void fetchClients();

    const channel = supabase
      .channel(`agenda:clients:${settings.storeAccountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agenda_clients",
          filter: `store_account_id=eq.${settings.storeAccountId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setClients((prev) => {
              const incoming = payload.new as Client;
              return prev.some((c) => c.id === incoming.id)
                ? prev
                : [incoming, ...prev];
            });
          }
          if (payload.eventType === "UPDATE" && payload.new) {
            setClients((prev) =>
              prev.map((c) =>
                c.id === (payload.new as Client).id
                  ? (payload.new as Client)
                  : c,
              ),
            );
          }
          if (payload.eventType === "DELETE" && payload.old) {
            setClients((prev) =>
              prev.filter((c) => c.id !== (payload.old as Client).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients, settings.storeAccountId]);

  const openDialog = (client?: Client) => {
    setPhoto(null);
    if (client) {
      setEditing(client);
      setName(client.name);
      setPhone(client.phone || "");
      setEmail(client.email || "");
      setNotes(client.notes || "");
    } else {
      setEditing(null);
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
    }
    setShowDialog(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      owner_user_id: settings.ownerUserId,
      store_account_id: settings.storeAccountId,
      name: name.trim(),
      phone: phone || "",
      email: email || null,
      notes: notes || null,
    };

    if(submitting||preparingPhoto)return;
    setSubmitting(true);
    const id=editing?.id||crypto.randomUUID();
    try{
      const {error}=editing?await supabase.from('agenda_clients').update(data).eq('id',id):await supabase.from('agenda_clients').insert({...data,id});
      if(error)throw error;
      if(photo){try{await uploadCollectionPhoto(settings.storeAccountId||'','clients',id,photo);setPhotoVersion(Date.now());}catch(error){setEditing({...data,id,created_at:editing?.created_at||new Date().toISOString()});toast({title:'Cliente salvo; foto não enviada',description:error instanceof Error?error.message:'Abra Editar para tentar novamente.',variant:'destructive'});return;}}
      toast({title:editing?'Cliente atualizado':'Cliente adicionado'});setShowDialog(false);
    }catch(error){toast({title:'Não foi possível salvar',description:error instanceof Error?error.message:'Tente novamente.',variant:'destructive'});}finally{setSubmitting(false);void fetchClients();}
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("agenda_clients")
      .delete()
      .eq("id", deleteTarget.id);
    if (!error) {
      toast({ title: "Cliente removido" });
      fetchClients();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível remover.",
        variant: "destructive",
      });
    }
    setDeleteTarget(null);
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading)
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-serif text-xl font-semibold mb-2">
              Nenhum cliente
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhum cliente encontrado."
                : "Cadastre seus clientes para usar nas metas de fidelidade."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Telefone
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0,limit).map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-3"><CollectionPhoto store={settings.storeAccountId||''} kind="clients" id={client.id} name={client.name} version={`${photoVersion}-${client.updated_at||''}`}/><span>{client.name}</span></span>
                      {client.phone && (
                        <span className="block sm:hidden text-xs text-muted-foreground mt-0.5">
                          {client.phone}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {client.phone || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {client.email || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(client)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(client)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ListMore total={filtered.length} shown={limit} onMore={()=>setLimit(n=>n+10)}/>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              Cadastre os dados do cliente para uso nas metas de fidelidade e
              agendamentos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>{photo?<img src={photo} alt="Prévia da foto do cliente" className="h-14 w-14 rounded-lg object-cover mb-2"/>:editing?<CollectionPhoto store={settings.storeAccountId||''} kind="clients" id={editing.id} name={editing.name} version={String(photoVersion)}/>:null}<Label htmlFor="client-photo" className="block my-2">Foto do cliente</Label><Input id="client-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={submitting||preparingPhoto} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setPreparingPhoto(true);try{setPhoto(await prepareProfileImage(file,256));}catch(error){toast({title:'Confira a foto',description:error instanceof Error?error.message:'Imagem inválida.',variant:'destructive'});}finally{setPreparingPhoto(false);}}}/></div>

            <div>
              <Label>Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações sobre o cliente..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={submitting||preparingPhoto}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
