export default function POSLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="pos-layout h-screen overflow-hidden bg-background">
            {/* Sin navbar ni footer, solo el contenido */}
            {children}
        </div>
    );
}
