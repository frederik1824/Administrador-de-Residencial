import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoResinova from '../assets/logo-resinova.png';

export function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">

            {/* Background Ornaments */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Card Component */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 rounded-3xl p-8 sm:p-10">

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-48 h-16 flex items-center justify-center mb-6">
                            <img src={logoResinova} alt="ResiNova Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            ResiNova Admin
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-center text-sm font-medium">
                            Accede al panel de control de tu residencial
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                            >
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 placeholder:text-slate-400"
                                placeholder="admin@residencial.com"
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                            >
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 placeholder:text-slate-400"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-400">Recordarme</span>
                            </label>
                            <a href="#" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                                ¿Olvidaste tu contraseña?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-blue-600 disabled:opacity-70 disabled:hover:bg-primary text-white font-semibold py-3.5 rounded-xl shadow-md shadow-primary/20 transition-all duration-200 active:scale-[0.98] flex items-center justify-center"
                        >
                            {loading ? (
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : 'Iniciar Sesión'}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}
