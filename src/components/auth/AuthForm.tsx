import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Loader2, CheckCircle } from 'lucide-react';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (forgotPassword) {
        const { error } = await (await import('@/integrations/supabase/client')).supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          setError(error.message);
        } else {
          setResetSent(true);
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else {
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) setError(error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-xl p-8 border border-border">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4 animate-glow">
              <MessageSquare className="w-9 h-9 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {forgotPassword ? 'Reset Password' : 'Welcome back!'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {forgotPassword
                ? 'Enter your email to receive a reset link'
                : isLogin ? 'Sign in to continue chatting' : 'Create an account to get started'}
            </p>
          </div>

          {resetSent ? (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <CheckCircle className="w-12 h-12 text-primary" />
              <p className="text-foreground font-medium">Check your email!</p>
              <p className="text-muted-foreground text-sm">We sent a password reset link to {email}</p>
              <button
                type="button"
                onClick={() => { setForgotPassword(false); setResetSent(false); setError(null); }}
                className="text-sm text-primary hover:underline mt-2"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && !forgotPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="cooluser123"
                      className="bg-input border-border"
                      required={!isLogin && !forgotPassword}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-input border-border"
                    required
                  />
                </div>
                {!forgotPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-input border-border"
                      required
                      minLength={6}
                    />
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {forgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-4 text-center space-y-2">
                {isLogin && !forgotPassword && (
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(true); setError(null); }}
                    className="text-sm text-muted-foreground hover:text-primary hover:underline block w-full"
                  >
                    Forgot your password?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (forgotPassword) {
                      setForgotPassword(false);
                    } else {
                      setIsLogin(!isLogin);
                    }
                    setError(null);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {forgotPassword
                    ? 'Back to sign in'
                    : isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
