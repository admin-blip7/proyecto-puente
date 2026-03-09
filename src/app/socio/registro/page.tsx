import SocioRegisterForm from "@/components/socio/SocioRegisterForm";

export const metadata = {
  title: "Registro de Socio - 22 Electronic",
  description: "Únete al programa Socio 22+ y accede a precios mayoristas",
};

export default function SocioRegistroPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SocioRegisterForm />
    </div>
  );
}
