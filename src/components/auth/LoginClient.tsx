"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { StoreIcon } from "lucide-react";
import { useAuth } from "@/lib/hooks";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor ingrese un correo válido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

export default function LoginClient() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  // We get signOut to ensure we can re-render when auth state changes.
  // The actual sign-in logic will be mocked in the provider.
  const { signOut } = useAuth(); 

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "empleado@tienda.com",
      password: "password",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    // Simulate a login delay
    setTimeout(() => {
      if (values.email === "empleado@tienda.com" && values.password === "password") {
        // The AuthProvider will handle the redirect and state change.
        // We just need to trigger a state update. A "real" sign-in is not needed.
        // In this mock, we reload the page to make the provider re-evaluate.
        window.location.href = "/";

      } else {
        toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: "Credenciales incorrectas. Por favor, intente de nuevo.",
        });
      }
      setLoading(false);
    }, 1000);
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
                    <Input placeholder="empleado@tienda.com" {...field} />
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
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Usuario: <strong>empleado@tienda.com</strong><br />
          Contraseña: <strong>password</strong>
        </p>
      </CardContent>
    </Card>
  );
}
