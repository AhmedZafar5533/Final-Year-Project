import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const { login, signup } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        
        if (!isLogin && password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        let res;
        if (isLogin) {
            res = await login(email, password);
        } else {
            res = await signup(email, password, fullName);
        }

        if (res.success) {
            if (res.message) {
                setSuccessMessage(res.message);
                // Optional: Clear form
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setFullName('');
            }
        } else {
            setError(res.error);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:5000/api/auth/login';
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>{isLogin ? 'Welcome back' : 'Create account'}</h1>
                <p className="auth-subtitle">{isLogin ? 'Login to your account' : 'Sign up for a new account'}</p>
                
                <button className="auth-btn google-btn" onClick={handleGoogleLogin}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" />
                    Continue with Google
                </button>

                <div className="separator">
                    <span>or</span>
                </div>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label>Full Name</label>
                            <input 
                                type="text" 
                                placeholder="John Doe" 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)} 
                                required 
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            placeholder="mail@example.com" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                            />
                            <button 
                                type="button" 
                                className="toggle-password" 
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "HIDE" : "SHOW"}
                            </button>
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <div className="input-wrapper">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>
                    )}

                    {error && <p className="error-text">{error}</p>}
                    {successMessage && <p className="success-text">{successMessage}</p>}

                    <button type="submit" className="auth-btn primary-btn">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                <p className="auth-switch">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                        setSuccessMessage('');
                        setConfirmPassword('');
                    }}>
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
}
