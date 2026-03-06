"use client"

import { useAuth } from "@/lib/hooks"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SocioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Solo Socio puede acceder
      if (userProfile?.role !== "Socio") {
        router.push("/login")
      }
      // Redirigir al dashboard si está en la raíz
      else if (window.location.pathname === "/socio") {
        router.push("/socio/dashboard")
      }
    }
  }, [loading, userProfile, router])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!userProfile || userProfile.role !== "Socio") {
    return null
  }

  return <>{children}</>
}
