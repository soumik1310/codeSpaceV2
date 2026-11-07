import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { loginUser, registerUser } from '../authSlice';
import '../landing.css';

/* Field names (emailId, password, firstName) match what the backend expects. */
const loginSchema = z.object({
  emailId: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// The backend uses validator.isStrongPassword, so mirror its rules here.
const signupSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(20, 'Name must be 20 characters or fewer'),
  emailId: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[a-z]/, 'Add a lowercase letter')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/[0-9]/, 'Add a number')
    .regex(/[^A-Za-z0-9]/, 'Add a symbol (e.g. ! @ #)'),
});

const PATHS = { login: '/login', reg: '/signup' };

function PasswordField({ id, placeholder, autoComplete, error, registerProps }) {
  const [show, setShow] = useState(false);
  return (
    <div className="cs-field">
      <div className="cs-inputwrap">
        <Lock className="cs-i" size={22} strokeWidth={1.8} aria-hidden="true" />
        <input
          id={id}
          className="cs-input"
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          aria-label="Password"
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : 'false'}
          {...registerProps}
        />
        <button
          type="button"
          className="cs-eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <Eye size={22} strokeWidth={1.8} /> : <EyeOff size={22} strokeWidth={1.8} />}
        </button>
      </div>
      {error && <p className="cs-err" role="alert">{error.message}</p>}
    </div>
  );
}

function TextField({ id, icon, type, placeholder, label, autoComplete, error, registerProps }) {
  return (
    <div className="cs-field">
      <div className="cs-inputwrap">
        {icon}
        <input
          id={id}
          className="cs-input"
          type={type}
          placeholder={placeholder}
          aria-label={label}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : 'false'}
          {...registerProps}
        />
      </div>
      {error && <p className="cs-err" role="alert">{error.message}</p>}
    </div>
  );
}

function SubmitButton({ busy, children }) {
  return (
    <button type="submit" className="cs-btn cs-submit" disabled={busy}>
      {busy ? <span className="cs-spin" aria-label="Please wait" /> : (
        <>
          {children}
          <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
        </>
      )}
    </button>
  );
}

function Landing({ initialTab = 'login' }) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState(initialTab === 'register' ? 'reg' : 'login');
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const cardRef = useRef(null);

  const loginForm = useForm({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm({ resolver: zodResolver(signupSchema) });

  const go = (to) => {
    if (to === tab) return;
    setTab(to);
    setServerError('');
    // keep the URL in sync (/login <-> /signup) without remounting the page
    try { window.history.replaceState(window.history.state, '', PATHS[to]); } catch { /* ignore */ }
  };

  const submit = (action) => async (data) => {
    setBusy(true);
    setServerError('');
    try {
      await dispatch(action(data)).unwrap();
      // on success authSlice flips isAuthenticated and App redirects to "/"
    } catch (err) {
      const msg = err?.response?.data;
      setServerError(
        typeof msg === 'string' && msg
          ? msg.replace(/^(Error:\s*)+/i, '')
          : 'Something went wrong. Please try again.'
      );
      setBusy(false);
    }
  };

  const startExploring = () => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const id = tab === 'login' ? 'cs-login-email' : 'cs-reg-name';
    setTimeout(() => document.getElementById(id)?.focus({ preventScroll: true }), 350);
  };

  const loginPanel = tab === 'login' ? 'cs-panel' : 'cs-panel off left';
  const regPanel = tab === 'reg' ? 'cs-panel' : 'cs-panel off right';

  return (
    <div className="cs-landing">
      <div className="cs-blob cs-b1" aria-hidden="true" />
      <div className="cs-blob cs-b2" aria-hidden="true" />

      <div className="cs-wrap">
        <header className="cs-header">
          <div className="cs-logo">Code<span>Space</span></div>
          <div className="cs-top">
            <span>{tab === 'login' ? 'New here?' : 'Have an account?'}</span>
            <button
              type="button"
              className="cs-linkbtn"
              onClick={() => go(tab === 'login' ? 'reg' : 'login')}
            >
              {tab === 'login' ? 'Create an account' : 'Login'}
              <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="cs-main">
          <section>
            <h1 className="cs-h1">Your Coding Journey <em>Starts Here.</em></h1>
            <p className="cs-tag">
              Sharpen your skills...<br />write your <b>next chapter.</b>
            </p>
            <button type="button" className="cs-btn" onClick={startExploring}>
              Start Exploring <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </section>

          <section className="cs-card" aria-label="Account" ref={cardRef}>
            <div className="cs-tabs" role="tablist">
              <button
                type="button" role="tab" id="cs-t-login" className="cs-tab"
                aria-selected={tab === 'login'} aria-controls="cs-p-login"
                onClick={() => go('login')}
              >Login</button>
              <button
                type="button" role="tab" id="cs-t-reg" className="cs-tab"
                aria-selected={tab === 'reg'} aria-controls="cs-p-reg"
                onClick={() => go('reg')}
              >Register</button>
              <span className="cs-ink" style={{ transform: tab === 'reg' ? 'translateX(100%)' : 'translateX(0)' }} />
            </div>

            <div className="cs-panels">
              {/* LOGIN */}
              <form
                className={loginPanel} id="cs-p-login" role="tabpanel" aria-labelledby="cs-t-login"
                noValidate onSubmit={loginForm.handleSubmit(submit(loginUser))}
              >
                <h2 className="cs-h2">Welcome back!</h2>
                <p className="cs-sub">Continue your coding journey</p>

                {tab === 'login' && serverError && <p className="cs-server-err" role="alert">{serverError}</p>}

                <TextField
                  id="cs-login-email" icon={<Mail className="cs-i" size={22} strokeWidth={1.8} aria-hidden="true" />} type="email" placeholder="Email address"
                  label="Email address" autoComplete="email"
                  error={loginForm.formState.errors.emailId}
                  registerProps={loginForm.register('emailId')}
                />
                <PasswordField
                  id="cs-login-password" placeholder="Password" autoComplete="current-password"
                  error={loginForm.formState.errors.password}
                  registerProps={loginForm.register('password')}
                />
                <SubmitButton busy={busy && tab === 'login'}>Login</SubmitButton>

                <div className="cs-or">or</div>
                <p className="cs-alt">
                  Don't have an account?{' '}
                  <button type="button" className="cs-linkbtn cs-underline" onClick={() => go('reg')}>Create one</button>
                </p>
              </form>

              {/* REGISTER */}
              <form
                className={regPanel} id="cs-p-reg" role="tabpanel" aria-labelledby="cs-t-reg"
                noValidate onSubmit={signupForm.handleSubmit(submit(registerUser))}
              >
                <h2 className="cs-h2">Create your account</h2>
                <p className="cs-sub">Start your coding journey</p>

                {tab === 'reg' && serverError && <p className="cs-server-err" role="alert">{serverError}</p>}

                <TextField
                  id="cs-reg-name" icon={<User className="cs-i" size={22} strokeWidth={1.8} aria-hidden="true" />} type="text" placeholder="Full name"
                  label="Full name" autoComplete="name"
                  error={signupForm.formState.errors.firstName}
                  registerProps={signupForm.register('firstName')}
                />
                <TextField
                  id="cs-reg-email" icon={<Mail className="cs-i" size={22} strokeWidth={1.8} aria-hidden="true" />} type="email" placeholder="Email address"
                  label="Email address" autoComplete="email"
                  error={signupForm.formState.errors.emailId}
                  registerProps={signupForm.register('emailId')}
                />
                <PasswordField
                  id="cs-reg-password" placeholder="Password" autoComplete="new-password"
                  error={signupForm.formState.errors.password}
                  registerProps={signupForm.register('password')}
                />
                <SubmitButton busy={busy && tab === 'reg'}>Register</SubmitButton>

                <div className="cs-or">or</div>
                <p className="cs-alt">
                  Already have an account?{' '}
                  <button type="button" className="cs-linkbtn cs-underline" onClick={() => go('login')}>Login</button>
                </p>
              </form>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Landing;
