'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [logoError, setLogoError] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email hoặc mật khẩu không đúng')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo & Title */}
        <div className="text-center mb-8">
          {!logoError ? (
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 p-1.5">
              <Image
                src="/logo-abs.png"
                alt="ABS"
                width={56}
                height={56}
                className="object-contain w-full h-full"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#205FA6] rounded-2xl mb-4">
              <span className="text-white text-xl font-bold">A</span>
            </div>
          )}
          <h1 className="text-2xl font-semibold text-gray-900">Đại lý thuế ABS</h1>
          <p className="text-gray-500 text-sm mt-1">Hệ thống quản lý nội bộ</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ten@dailythueabs.vn"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#205FA6] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#205FA6] focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#205FA6] text-white py-2 rounded-lg text-sm font-medium
                         hover:bg-[#184a80] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Liên hệ admin để được cấp tài khoản
        </p>

      </div>
    </div>
  )
}