import React from 'react';

export const Button = ({ children, variant = 'primary', size = 'default', className = '', ...props }) => {
    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
    };

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-lg",
        icon: "h-10 w-10",
    };

    const variantClass = variants[variant] || variants.primary;
    const sizeClass = sizes[size] || sizes.default;

    return (
        <button
            className={`inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95 ${variantClass} ${sizeClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export const Input = ({ label, className = '', containerClassName = '', ...props }) => {
    return (
        <div className={`flex flex-col gap-2 w-full ${containerClassName}`}>
            {label && <label className="text-sm font-semibold text-muted-foreground">{label}</label>}
            <input
                className={`flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
                {...props}
            />
        </div>
    );
};

export const Card = ({ children, className = '' }) => (
    <div className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ${className}`}>
        <div className="p-6">
            {children}
        </div>
    </div>
);
