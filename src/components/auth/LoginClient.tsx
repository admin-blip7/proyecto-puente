"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, sendPasswordResetEmail } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { StoreIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { UserProfile } from "@/types";
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

const resetFormSchema = z.object({
    resetEmail: z.string().email({ message: "Por favor ingrese un correo válido." })
})

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
        await sendPasswordResetEmail(auth, resetEmail);
        toast({
            title: "Correo Enviado",
            description: "Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña."
        });
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo enviar el correo de restablecimiento."
        })
    } finally {
        setResetLoading(false);
    }
  }


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      // Try to sign in
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push("/");
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // If user not found, create a new user (for demo purposes)
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
          const user = userCredential.user;
          
          // Create user profile in Firestore
          const userProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || "Admin de Tienda",
            email: user.email!,
            role: "Admin",
          };
          await setDoc(doc(db, "users", user.uid), userProfile);
          
          router.push("/");
        } catch (createError: any) {
          toast({
            variant: "destructive",
            title: "Error de registro",
            description: createError.message,
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: "Credenciales incorrectas. Por favor, intente de nuevo.",
        });
      }
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
