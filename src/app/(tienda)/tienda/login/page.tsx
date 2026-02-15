import { CustomerLogin } from "@/components/tienda/auth/CustomerLogin";

export default function LoginPage() {
    return (
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
            <CustomerLogin />
        </div>
    );
}
