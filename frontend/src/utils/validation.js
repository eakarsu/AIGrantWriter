export const validators = {
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Invalid email format';
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    if (!/^https?:\/\/.+/.test(value)) {
      return 'URL must start with http:// or https://';
    }
    return null;
  },

  minLength: (value, min) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value, max) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  positiveNumber: (value, fieldName = 'Value') => {
    if (!value && value !== 0) return null;
    if (isNaN(value) || Number(value) < 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  },

  date: (value) => {
    if (!value) return null;
    if (isNaN(new Date(value).getTime())) {
      return 'Invalid date format';
    }
    return null;
  },

  futureDate: (value) => {
    if (!value) return null;
    if (new Date(value) < new Date()) {
      return 'Date must be in the future';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    if (!/^[+\d\s()-]{7,20}$/.test(value)) {
      return 'Invalid phone number format';
    }
    return null;
  },

  password: (value) => {
    if (!value) return 'Password is required';
    const checks = {
      minLength: value.length >= 8,
      hasUppercase: /[A-Z]/.test(value),
      hasLowercase: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    if (passed < 4) {
      return 'Password must include uppercase, lowercase, number, and special character';
    }
    return null;
  },

  passwordMatch: (password, confirmPassword) => {
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  },
};

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', checks: {} };

  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  return { score, label: labels[score], checks };
};
