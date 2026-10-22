import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, NavLink } from 'react-router';
import { getSafeRedirect } from '../utils/redirect';
import { registerUser } from '../authSlice';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const signupSchema = z.object({
  firstName: z.string().min(3, "Minimum 3 characters").max(20, "Maximum 20 characters"),
  emailId: z.string().email("Invalid Email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[0-9]/, "Add a number")
    .regex(/[^A-Za-z0-9]/, "Add a symbol (e.g. ! @ #)")
});

function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getSafeRedirect(location.search));
    }
  }, [isAuthenticated, navigate, location.search]);

  const onSubmit = (data) => {
    dispatch(registerUser(data));
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start practicing in a minute."
      footer={
        <>
          Already have an account?{' '}
          <NavLink to={`/login${location.search}`} className="auth-link">Log in</NavLink>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="firstName" className="auth-label">First name</label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="John"
            aria-invalid={errors.firstName ? 'true' : 'false'}
            className="auth-input"
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="auth-error">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="emailId" className="auth-label">Email</label>
          <input
            id="emailId"
            type="email"
            autoComplete="email"
            placeholder="john@example.com"
            aria-invalid={errors.emailId ? 'true' : 'false'}
            className="auth-input"
            {...register('emailId')}
          />
          {errors.emailId && (
            <p className="auth-error">{errors.emailId.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="auth-label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={errors.password ? 'true' : 'false'}
              className="auth-input pr-11"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#8b93c4] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="auth-error">{errors.password.message}</p>
          )}
        </div>

        {error && <p className="auth-error text-center">{error}</p>}

        <div className="pt-3">
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Signing up...
              </>
            ) : 'Sign up'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Signup;