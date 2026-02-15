'use client'

import { useState } from 'react'
import { User, ShoppingBag, Package, Heart, MapPin, CreditCard, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'

export function CuentaDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState<'pedidos' | 'datos' | 'direcciones' | 'deseos'>('pedidos')

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-secondary/30 rounded-2xl p-8 text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-editors-note text-2xl font-thin mb-4">
            Mi Cuenta
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Inicia sesion para ver tus pedidos, guardar direcciones y mas.
          </p>
          <div className="space-y-3">
            <button className="w-full bg-accent text-black py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors">
              Iniciar Sesion
            </button>
            <button className="w-full border border-border py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-secondary transition-colors">
              Crear Cuenta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-editors-note text-3xl lg:text-4xl font-thin">
          Mi Cuenta
        </h1>
        <p className="text-muted-foreground">Bienvenido de nuevo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'pedidos'
                ? 'bg-accent text-black font-medium'
                : 'bg-secondary/30 hover:bg-secondary/50'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Mis Pedidos
          </button>
          <button
            onClick={() => setActiveTab('datos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'datos'
                ? 'bg-accent text-black font-medium'
                : 'bg-secondary/30 hover:bg-secondary/50'
            }`}
          >
            <User className="h-4 w-4" />
            Mis Datos
          </button>
          <button
            onClick={() => setActiveTab('direcciones')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'direcciones'
                ? 'bg-accent text-black font-medium'
                : 'bg-secondary/30 hover:bg-secondary/50'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Direcciones
          </button>
          <button
            onClick={() => setActiveTab('deseos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'deseos'
                ? 'bg-accent text-black font-medium'
                : 'bg-secondary/30 hover:bg-secondary/50'
            }`}
          >
            <Heart className="h-4 w-4" />
            Lista de Deseos
          </button>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-muted-foreground hover:bg-secondary/50 transition-colors">
            <Settings className="h-4 w-4" />
            Configuracion
          </button>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="h-4 w-4" />
            Cerrar Sesion
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'pedidos' && (
            <div className="bg-secondary/30 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Mis Pedidos</h2>
              <p className="text-sm text-muted-foreground text-center py-8">
                No tienes pedidos aun.
              </p>
              <Link
                href="/tienda"
                className="block w-full bg-accent text-black text-center py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors"
              >
                Explorar Productos
              </Link>
            </div>
          )}

          {activeTab === 'datos' && (
            <div className="bg-secondary/30 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Mis Datos Personales</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Nombre</label>
                    <input type="text" className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-sm" placeholder="Juan" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Apellidos</label>
                    <input type="text" className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-sm" placeholder="Perez Garcia" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Email</label>
                  <input type="email" className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-sm" placeholder="juan@ejemplo.com" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Telefono</label>
                  <input type="tel" className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-sm" placeholder="+52 55 1234 5678" />
                </div>
                <button type="submit" className="w-full bg-accent text-black py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors">
                  Guardar Cambios
                </button>
              </form>
            </div>
          )}

          {activeTab === 'direcciones' && (
            <div className="bg-secondary/30 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Mis Direcciones</h2>
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">No tienes direcciones guardadas.</p>
                <button className="bg-accent text-black px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors">
                  Agregar Direccion
                </button>
              </div>
            </div>
          )}

          {activeTab === 'deseos' && (
            <div className="bg-secondary/30 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Mi Lista de Deseos</h2>
              <div className="text-center py-8">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">Tu lista de deseos esta vacia.</p>
                <Link href="/tienda" className="inline-flex items-center gap-2 bg-accent text-black px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors">
                  Explorar Productos
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
