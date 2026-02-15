'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks'
import { supabase } from '@/lib/supabaseClient'
import { Loader2 } from 'lucide-react'

export default function ProfilePage() {
    const { user, userProfile } = useAuth()
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (userProfile?.name) {
            setName(userProfile.name)
        }
    }, [userProfile])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            if (!supabase) throw new Error("Supabase client not initialized");
            const { error } = await supabase.auth.updateUser({
                data: { name }
            })

            if (error) throw error

            setMessage('Perfil actualizado correctamente')
        } catch (error) {
            console.error(error)
            setMessage('Error al actualizar el perfil')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Mi Perfil</h1>

            <div className="bg-card border border-border rounded-xl p-6 max-w-lg">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-muted-foreground"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        />
                    </div>

                    {message && (
                        <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar Cambios
                    </button>
                </form>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 max-w-lg">
                <h2 className="text-lg font-semibold mb-4">Seguridad</h2>
                <button
                    onClick={async () => {
                        if (!supabase) return;
                        await supabase.auth.resetPasswordForEmail(user?.email || '', {
                            redirectTo: window.location.origin + '/reset-password',
                        })
                        alert('Se ha enviado un correo para restablecer tu contraseña.')
                    }}
                    className="text-sm text-primary hover:underline"
                >
                    Cambiar contraseña
                </button>
            </div>
        </div>
    )
}
