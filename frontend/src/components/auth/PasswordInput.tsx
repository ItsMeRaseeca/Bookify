import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getPasswordStrength } from '@/lib/helpers';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  error?: string;
  id?: string;
  name?: string;
  className?: string;
}

const requirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: '1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: '1 lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: '1 number', test: (p: string) => /[0-9]/.test(p) },
  { label: '1 special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  showStrength = false,
  error,
  id,
  name,
  className,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const strength = getPasswordStrength(value);

  const strengthColors = {
    weak: 'bg-booked',
    medium: 'bg-hold',
    strong: 'bg-available',
  };

  const strengthLabels = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          id={id}
          name={name}
          className={cn(
            error ? 'border-destructive focus-visible:ring-destructive' : '',
            className
          )}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <motion.div
            key={visible ? 'visible' : 'hidden'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </motion.div>
        </button>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-destructive"
        >
          {error}
        </motion.p>
      )}

      {showStrength && value.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          {/* Strength bar */}
          <div className="space-y-1.5">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${strengthColors[strength.level]} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${strength.score * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Password strength</span>
              <motion.span
                key={strength.level}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-medium ${
                  strength.level === 'weak' ? 'text-booked' :
                  strength.level === 'medium' ? 'text-hold' : 'text-available'
                }`}
              >
                {strengthLabels[strength.level]}
              </motion.span>
            </div>
          </div>

          {/* Requirements list */}
          <div className="space-y-1">
            {requirements.map((req, index) => {
              const met = req.test(value);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: met ? [1.2, 1] : 1,
                      backgroundColor: met ? 'hsl(var(--available))' : 'hsl(var(--muted))',
                    }}
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                  >
                    {met ? (
                      <Check size={10} className="text-available-foreground" />
                    ) : (
                      <X size={10} className="text-muted-foreground" />
                    )}
                  </motion.div>
                  <span className={met ? 'text-foreground' : 'text-muted-foreground'}>
                    {req.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
