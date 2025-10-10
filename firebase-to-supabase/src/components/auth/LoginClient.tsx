"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { StoreIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor ingrese un correo válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

export default function LoginClient() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "admin@tienda.com",
      password: "password",
    },
  });

  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({ variant: "destructive", title: "Error", description: "El campo de correo no puede estar vacío."});
        return;
    }
    setResetLoading(true);
    try {
        if (!supabase) {
          throw new Error("Supabase no está configurado");
        }
        const origin = typeof window !== "undefined" ? window.location.origin : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: origin ? `${origin}/login` : undefined,
        });
        if (error) {
          throw error;
        }
        toast({
            title: "Correo Enviado",
            description: "Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña."
        });
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error?.message || "No se pudo enviar el correo de restablecimiento."
        })
    } finally {
        setResetLoading(false);
    }
  }


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      if (!supabase) {
        throw new Error("Supabase no está configurado");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message?.toLowerCase().includes("invalid")) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
              data: {
                name: "Admin de Tienda",
                role: "Admin",
              },
            },
          });

          if (signUpError) {
            throw signUpError;
          }

          toast({
            title: "Cuenta creada",
            description: "Se ha creado una nueva cuenta. Revisa tu correo para confirmar el acceso si es necesario.",
          });
        } else {
          throw error;
        }
      }

      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: error.message || "No fue posible iniciar sesión.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <StoreIcon className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl font-headline">Storefront Swift</CardTitle>
        <CardDescription>Bienvenido al Sistema de Punto de Venta</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@tienda.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                   <div className="relative">
                        <FormControl>
                            <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field} 
                            />
                        </FormControl>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                            onClick={() => setShowPassword(prev => !prev)}
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                   </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="animate-spin mr-2"/> Iniciando...</> : "Iniciar Sesión"}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="link" className="text-sm text-muted-foreground px-1">
                        ¿Olvidaste tu contraseña?
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Restablecer Contraseña</AlertDialogTitle>
                    <AlertDialogDescription>
                        Ingresa tu correo electrónico y te enviaremos un enlace para que puedas restablecer tu contraseña.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="reset-email">Correo electrónico</Label>
                        <Input 
                            id="reset-email"
                            type="email" 
                            placeholder="tu@correo.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset} disabled={isResetLoading}>
                       {isResetLoading ? <><Loader2 className="animate-spin mr-2"/> Enviando...</> : "Enviar Correo"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
