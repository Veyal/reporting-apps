'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
}

export default function ConfirmDialog({
    isOpen,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: 'text-red-500',
                    iconBg: 'bg-red-500/10',
                    button: 'bg-red-500 hover:bg-red-600 text-white'
                };
            case 'warning':
                return {
                    icon: 'text-yellow-500',
                    iconBg: 'bg-yellow-500/10',
                    button: 'bg-yellow-500 hover:bg-yellow-600 text-black'
                };
            default:
                return {
                    icon: 'text-accent-400',
                    iconBg: 'bg-accent-500/10',
                    button: 'bg-accent-500 hover:bg-accent-600 text-white'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-gothic-800 rounded-xl border border-gothic-700 shadow-gothic-xl w-full max-w-sm animate-fade-in">
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gothic-700 transition-colors"
                >
                    <X className="w-4 h-4 text-gothic-400" />
                </button>

                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center mx-auto mb-4`}>
                        <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-display font-semibold text-gothic-100 text-center mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-sm text-gothic-300 text-center mb-6">
                        {message}
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2.5 px-4 bg-gothic-700 hover:bg-gothic-600 text-gothic-200 rounded-lg text-sm font-medium transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${styles.button}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
